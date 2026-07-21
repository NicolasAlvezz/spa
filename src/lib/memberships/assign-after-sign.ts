import { createServiceClient } from '@/lib/supabase/server'
import { calculateRollover } from '@/lib/utils/membership'
import { MONTHLY_PLAN_MIN_MONTHS } from '@/lib/constants/membership'
import { todayInSpaTz } from '@/lib/utils/dates'
import { addOneMonth } from '@/lib/memberships/session-cycle'

interface AssignMembershipParams {
  requestId: string
  clientId: string
  planId: string
}

/**
 * Creates the membership + payment after a contract is signed.
 * Runs in the background (via waitUntil) so the sign API can respond
 * immediately — critical for US mobile clients on cellular data where
 * long-lived connections are frequently dropped mid-response.
 */
export async function assignMembershipAfterSign({
  requestId,
  clientId,
  planId,
}: AssignMembershipParams): Promise<void> {
  const supabase = createServiceClient()

  const { data: plan } = await supabase
    .from('membership_plans')
    .select('price_usd, plan_type, total_sessions, sessions_per_month')
    .eq('id', planId)
    .single()

  if (!plan) return

  const isPack = plan.plan_type === 'pack'
  const todayStr = todayInSpaTz()

  const { data: currentMembership } = await supabase
    .from('memberships')
    .select('id, status, expires_at, sessions_used_this_month, months_completed, sessions_remaining, membership_plans(sessions_per_month, plan_type)')
    .eq('client_id', clientId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let started_at: string
  let expires_at: string
  let rollover_sessions = 0

  if (isPack) {
    started_at = todayStr
    const packExpiry = new Date(todayStr + 'T12:00:00Z')
    packExpiry.setUTCMonth(packExpiry.getUTCMonth() + 2)
    expires_at = packExpiry.toISOString().split('T')[0]
  } else {
    const currentExpiry = currentMembership?.expires_at
    if (currentExpiry && currentExpiry >= todayStr) {
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
    const prevPlan = currentMembership?.membership_plans as unknown as { sessions_per_month: number; plan_type: string } | null
    if (prevPlan && prevPlan.plan_type !== 'pack') {
      rollover_sessions = calculateRollover(
        currentMembership?.sessions_used_this_month ?? 0,
        prevPlan.sessions_per_month,
        0,
      )
    }
  }

  const { data: newMembership } = await supabase
    .from('memberships')
    .insert({
      client_id: clientId,
      plan_id: planId,
      started_at,
      expires_at,
      status: 'active',
      sessions_used_this_month: 0,
      rollover_sessions: isPack ? 0 : rollover_sessions,
      months_committed: isPack ? 0 : MONTHLY_PLAN_MIN_MONTHS,
      months_completed: isPack ? 0 : (currentMembership?.months_completed ?? 0) + 1,
      sessions_remaining: isPack ? (plan.total_sessions ?? null) : null,
      split_payment_pending: false,
      membership_request_id: requestId,
      next_session_reset_at: isPack ? null : addOneMonth(started_at),
    })
    .select('id')
    .single()

  if (!newMembership) return

  await supabase.from('payments').insert({
    client_id: clientId,
    membership_id: newMembership.id,
    amount_usd: Number(plan.price_usd),
    method: null,
    concept: isPack ? 'pack_purchase' : 'monthly_membership',
  })

  if (currentMembership?.status === 'active') {
    await supabase
      .from('memberships')
      .update({ status: 'expired' })
      .eq('id', currentMembership.id)
  }
}
