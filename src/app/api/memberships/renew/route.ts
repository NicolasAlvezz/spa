import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateRollover } from '@/lib/utils/membership'
import type { PaymentMethod } from '@/types'

export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: {
    client_id: string
    plan_id: string
    payment_method: PaymentMethod
    amount_usd: number
  } = await req.json()

  const { client_id, plan_id, payment_method, amount_usd } = body

  if (!client_id || !plan_id || !payment_method || !amount_usd) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }

  // Get the most recent non-cancelled membership for this client
  const { data: currentMembership } = await supabase
    .from('memberships')
    .select('id, status, expires_at, started_at, sessions_used_this_month, rollover_sessions, months_completed, membership_plans(sessions_per_month)')
    .eq('client_id', client_id)
    .neq('status', 'cancelled')
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Calculate new period dates
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let started_at: string
  let expires_at: string

  if (currentMembership) {
    const currentExpiry = new Date(currentMembership.expires_at)
    currentExpiry.setHours(0, 0, 0, 0)

    if (currentExpiry >= today) {
      // Renew before expiry — new period starts where the current one ends
      started_at = currentMembership.expires_at
      const newExpiry = new Date(currentExpiry)
      newExpiry.setMonth(newExpiry.getMonth() + 1)
      expires_at = newExpiry.toISOString().split('T')[0]
    } else {
      // Renew after expiry — new period starts today
      started_at = today.toISOString().split('T')[0]
      const newExpiry = new Date(today)
      newExpiry.setMonth(newExpiry.getMonth() + 1)
      expires_at = newExpiry.toISOString().split('T')[0]
    }
  } else {
    // First membership ever
    started_at = today.toISOString().split('T')[0]
    const newExpiry = new Date(today)
    newExpiry.setMonth(newExpiry.getMonth() + 1)
    expires_at = newExpiry.toISOString().split('T')[0]
  }

  // Calculate rollover to carry into the new period
  // Rule: if client didn't use their included session, they get 1 rollover next month
  let rollover_sessions = 0
  if (currentMembership) {
    const plan = currentMembership.membership_plans as unknown as { sessions_per_month: number } | null
    const sessionsPerMonth = plan?.sessions_per_month ?? 1
    rollover_sessions = calculateRollover(
      currentMembership.sessions_used_this_month,
      sessionsPerMonth,
      0, // start rollover count fresh — rollovers don't compound beyond 1 month
    )
  }

  // Mark previous membership as expired (if it was still active)
  if (currentMembership?.status === 'active') {
    await supabase
      .from('memberships')
      .update({ status: 'expired' })
      .eq('id', currentMembership.id)
  }

  // Create the new membership
  const { data: newMembership, error: membershipError } = await supabase
    .from('memberships')
    .insert({
      client_id,
      plan_id,
      started_at,
      expires_at,
      status: 'active',
      sessions_used_this_month: 0,
      rollover_sessions,
      months_committed: 3,
      months_completed: (currentMembership?.months_completed ?? 0) + 1,
    })
    .select('id, started_at, expires_at, rollover_sessions')
    .single()

  if (membershipError || !newMembership) {
    console.error('[POST /api/memberships/renew] membership insert:', membershipError)
    return NextResponse.json({ error: 'failed_to_create_membership' }, { status: 500 })
  }

  // Record the payment
  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      client_id,
      membership_id: newMembership.id,
      amount_usd,
      method: payment_method,
      concept: 'monthly_membership',
    })

  if (paymentError) {
    console.error('[POST /api/memberships/renew] payment insert:', paymentError)
    // Membership was created — don't rollback, just warn. Payment can be added manually.
  }

  return NextResponse.json({
    membership_id: newMembership.id,
    started_at: newMembership.started_at,
    expires_at: newMembership.expires_at,
    rollover_sessions: newMembership.rollover_sessions,
  })
}
