import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateRollover } from '@/lib/utils/membership'
import { MONTHLY_PLAN_MIN_MONTHS } from '@/lib/constants/membership'
import type { PaymentMethod } from '@/types'

const VALID_PAYMENT_METHODS: PaymentMethod[] = ['cash', 'debit', 'credit']

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

  if (!client_id || !plan_id || !payment_method) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }

  if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
    return NextResponse.json({ error: 'invalid_payment_method' }, { status: 400 })
  }

  if (typeof amount_usd !== 'number' || !Number.isFinite(amount_usd) || amount_usd <= 0) {
    return NextResponse.json({ error: 'invalid_amount' }, { status: 400 })
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
    .select('id, status, expires_at, sessions_used_this_month, rollover_sessions, months_completed, membership_plans(sessions_per_month, plan_type)')
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

      // Rollover only carries over from a monthly plan — packs use sessions_remaining,
      // not sessions_used_this_month, so calculating rollover on a pack would award
      // a free session.
      const prevPlan = currentMembership.membership_plans as unknown as { sessions_per_month: number; plan_type: string } | null
      if (prevPlan && prevPlan.plan_type !== 'pack') {
        rollover_sessions = calculateRollover(
          currentMembership.sessions_used_this_month,
          prevPlan.sessions_per_month,
          0,
        )
      }
    } else {
      started_at = today.toISOString().split('T')[0]
      const newExpiry = new Date(today)
      newExpiry.setMonth(newExpiry.getMonth() + 1)
      expires_at = newExpiry.toISOString().split('T')[0]
    }
  }

  const usingSplitPayment = isPack && !!split_payment && !!plan?.allows_split_payment

  // Insert the new membership FIRST. If anything below fails we roll it back so
  // the client never ends up with the old one expired and no new one active.
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
      months_committed: isPack ? 0 : MONTHLY_PLAN_MIN_MONTHS,
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
    // Roll back the new membership so we don't leave a paid-for membership without a payment.
    const { error: rollbackError } = await supabase
      .from('memberships')
      .delete()
      .eq('id', newMembership.id)
    if (rollbackError) {
      console.error('[POST /api/memberships/renew] rollback failed:', rollbackError)
    }
    return NextResponse.json({ error: 'failed_to_record_payment' }, { status: 500 })
  }

  // Now that the new membership + payment are in place, expire the old one.
  // If this fails the client still has a working active membership (the new one);
  // we just have a stale `active` flag on the previous record. getCurrentMembership()
  // resolves this deterministically by picking the most recently created one.
  if (currentMembership?.status === 'active') {
    const { error: expireError } = await supabase
      .from('memberships')
      .update({ status: 'expired' })
      .eq('id', currentMembership.id)
    if (expireError) {
      console.error('[memberships/renew] failed to expire previous membership (non-fatal):', expireError)
    }
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
