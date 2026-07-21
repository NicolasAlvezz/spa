import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { calculateRollover } from '@/lib/utils/membership'
import { MONTHLY_PLAN_MIN_MONTHS } from '@/lib/constants/membership'
import { todayInSpaTz } from '@/lib/utils/dates'
import { addOneMonth } from '@/lib/memberships/session-cycle'
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
    amount_usd: number
    split_payment?: boolean
    confirm_lose_unused_sessions?: boolean
    membership_request_id?: string | null
    use_credit?: boolean
  } = await req.json()

  const { client_id, plan_id, amount_usd, split_payment, confirm_lose_unused_sessions, membership_request_id, use_credit } = body

  if (!client_id || !plan_id) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
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

  // Idempotency: the sign route auto-creates the membership server-side, so if
  // the admin's browser also calls renew (because they were watching), skip creation.
  if (membership_request_id) {
    const { data: alreadyCreated } = await supabase
      .from('memberships')
      .select('id, started_at, expires_at, rollover_sessions, sessions_remaining, split_payment_pending')
      .eq('membership_request_id', membership_request_id)
      .maybeSingle()

    if (alreadyCreated) {
      return NextResponse.json({
        membership_id: alreadyCreated.id,
        started_at: alreadyCreated.started_at,
        expires_at: alreadyCreated.expires_at,
        rollover_sessions: alreadyCreated.rollover_sessions,
        sessions_remaining: alreadyCreated.sessions_remaining,
        split_payment_pending: alreadyCreated.split_payment_pending,
        is_pack: plan?.plan_type === 'pack',
      })
    }
  }

  const isPack = plan?.plan_type === 'pack'

  // Get the most recent non-cancelled membership for rollover calculation
  const { data: currentMembership } = await supabase
    .from('memberships')
    .select('id, status, expires_at, sessions_used_this_month, rollover_sessions, months_completed, sessions_remaining, membership_plans(sessions_per_month, plan_type)')
    .eq('client_id', client_id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // If the client is on an active pack with unused sessions, renewing/assigning
  // a new plan will expire it and the remaining sessions are forfeited. Require
  // the admin to acknowledge this so it can't happen by accident.
  if (
    currentMembership?.status === 'active' &&
    !confirm_lose_unused_sessions
  ) {
    const prev = currentMembership.membership_plans as unknown as { plan_type: string } | null
    const remaining = currentMembership.sessions_remaining ?? 0
    if (prev?.plan_type === 'pack' && remaining > 0) {
      return NextResponse.json(
        { error: 'unused_sessions_warning', sessions_remaining: remaining },
        { status: 409 }
      )
    }
  }

  // Use the spa's local date (America/New_York) to avoid UTC-vs-ET day mismatches
  const todayStr = todayInSpaTz()

  let started_at: string
  let expires_at: string
  let rollover_sessions = 0

  if (isPack) {
    // Packs expire 2 months from purchase date
    started_at = todayStr
    const packExpiry = new Date(todayStr + 'T12:00:00Z')
    packExpiry.setUTCMonth(packExpiry.getUTCMonth() + 2)
    expires_at = packExpiry.toISOString().split('T')[0]
  } else {
    // Monthly plan: calculate 1-month period
    if (currentMembership && currentMembership.membership_plans) {
      const currentExpiry = currentMembership.expires_at // YYYY-MM-DD string

      if (currentExpiry >= todayStr) {
        started_at = currentExpiry
        const d = new Date(currentExpiry + 'T12:00:00Z')
        d.setUTCMonth(d.getUTCMonth() + 6)
        expires_at = d.toISOString().split('T')[0]
      } else {
        started_at = todayStr
        const d = new Date(todayStr + 'T12:00:00Z')
        d.setUTCMonth(d.getUTCMonth() + 6)
        expires_at = d.toISOString().split('T')[0]
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
      started_at = todayStr
      const d = new Date(todayStr + 'T12:00:00Z')
      d.setUTCMonth(d.getUTCMonth() + 6)
      expires_at = d.toISOString().split('T')[0]
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
      next_session_reset_at: isPack ? null : addOneMonth(started_at),
      ...(membership_request_id ? { membership_request_id } : {}),
    })
    .select('id, started_at, expires_at, rollover_sessions, sessions_remaining, split_payment_pending')
    .single()

  if (membershipError || !newMembership) {
    console.error('[POST /api/memberships/renew] membership insert:', membershipError)
    return NextResponse.json({ error: 'failed_to_create_membership' }, { status: 500 })
  }

  // Apply credit if requested: use only up to the amount owed and keep the rest.
  let finalAmount = amount_usd
  let creditApplied = 0
  if (use_credit) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select('credit_balance')
      .eq('id', client_id)
      .single()
    const creditBalance = Number(clientRow?.credit_balance ?? 0)
    creditApplied = Math.min(creditBalance, amount_usd)
    if (creditApplied > 0) {
      finalAmount = amount_usd - creditApplied
      await supabase
        .from('clients')
        .update({ credit_balance: creditBalance - creditApplied })
        .eq('id', client_id)
    }
  }

  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      client_id,
      membership_id: newMembership.id,
      amount_usd: finalAmount,
      method: null,
      concept: isPack ? 'pack_purchase' : 'monthly_membership',
      ...(creditApplied > 0 ? { notes: `Credit applied: $${creditApplied}` } : {}),
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
