import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateRollover } from '@/lib/utils/membership'
import type { PaymentMethod } from '@/types'

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    console.error('[memberships/renew] unauthorized — user:', user?.id, 'authError:', authError?.message)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: {
    client_id: string
    plan_id: string
    payment_method: PaymentMethod
    amount_usd: number
    split_payment?: boolean  // true = paying $400 now, $400 before 5th session
  } = await req.json()

  const { client_id, plan_id, payment_method, amount_usd, split_payment } = body

  if (!client_id || !plan_id || !payment_method || !amount_usd) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch the selected plan to know if it's a pack or monthly
  const { data: plan } = await supabase
    .from('membership_plans')
    .select('plan_type, total_sessions, allows_split_payment, split_first_amount, sessions_per_month')
    .eq('id', plan_id)
    .single()

  const isPack = plan?.plan_type === 'pack'

  // Get the most recent non-cancelled membership for rollover calculation
  const { data: currentMembership } = await supabase
    .from('memberships')
    .select('id, status, expires_at, sessions_used_this_month, rollover_sessions, months_completed, membership_plans(sessions_per_month)')
    .eq('client_id', client_id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let started_at: string
  let expires_at: string
  let rollover_sessions = 0

  if (isPack) {
    // Packs don't expire by time — use a far-future sentinel date
    started_at = today.toISOString().split('T')[0]
    expires_at = '9999-12-31'
  } else {
    // Monthly plan: calculate 1-month period
    if (currentMembership && currentMembership.membership_plans) {
      const currentExpiry = new Date(currentMembership.expires_at)
      currentExpiry.setHours(0, 0, 0, 0)

      if (currentExpiry >= today) {
        started_at = currentMembership.expires_at
        const newExpiry = new Date(currentExpiry)
        newExpiry.setMonth(newExpiry.getMonth() + 1)
        expires_at = newExpiry.toISOString().split('T')[0]
      } else {
        started_at = today.toISOString().split('T')[0]
        const newExpiry = new Date(today)
        newExpiry.setMonth(newExpiry.getMonth() + 1)
        expires_at = newExpiry.toISOString().split('T')[0]
      }

      const prevPlan = currentMembership.membership_plans as unknown as { sessions_per_month: number } | null
      const sessionsPerMonth = prevPlan?.sessions_per_month ?? 1
      rollover_sessions = calculateRollover(
        currentMembership.sessions_used_this_month,
        sessionsPerMonth,
        0,
      )
    } else {
      started_at = today.toISOString().split('T')[0]
      const newExpiry = new Date(today)
      newExpiry.setMonth(newExpiry.getMonth() + 1)
      expires_at = newExpiry.toISOString().split('T')[0]
    }
  }

  // Mark previous active membership as expired
  if (currentMembership?.status === 'active') {
    await supabase
      .from('memberships')
      .update({ status: 'expired' })
      .eq('id', currentMembership.id)
  }

  const usingSplitPayment = isPack && !!split_payment && !!plan?.allows_split_payment

  const { data: newMembership, error: membershipError } = await supabase
    .from('memberships')
    .insert({
      client_id,
      plan_id,
      started_at,
      expires_at,
      status: 'active',
      sessions_used_this_month: 0,
      rollover_sessions: isPack ? 0 : rollover_sessions,
      months_committed: isPack ? 0 : 3,
      months_completed: isPack ? 0 : (currentMembership?.months_completed ?? 0) + 1,
      sessions_remaining: isPack ? (plan?.total_sessions ?? null) : null,
      split_payment_pending: usingSplitPayment,
    })
    .select('id, started_at, expires_at, rollover_sessions, sessions_remaining, split_payment_pending')
    .single()

  if (membershipError || !newMembership) {
    console.error('[POST /api/memberships/renew] membership insert:', membershipError)
    return NextResponse.json({ error: 'failed_to_create_membership' }, { status: 500 })
  }

  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      client_id,
      membership_id: newMembership.id,
      amount_usd,
      method: payment_method,
      concept: isPack ? 'pack_purchase' : 'monthly_membership',
    })

  if (paymentError) {
    console.error('[POST /api/memberships/renew] payment insert:', paymentError)
  }

  return NextResponse.json({
    membership_id: newMembership.id,
    started_at: newMembership.started_at,
    expires_at: newMembership.expires_at,
    rollover_sessions: newMembership.rollover_sessions,
    sessions_remaining: newMembership.sessions_remaining,
    split_payment_pending: newMembership.split_payment_pending,
    is_pack: isPack,
  })
}
