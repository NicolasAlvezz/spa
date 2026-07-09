'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const authClient = await createClient()
  const { data: { user }, error } = await authClient.auth.getUser()
  if (error || !user || user.app_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function deleteVisit(visitId: string, clientId: string): Promise<void> {
  await requireAdmin()
  const supabase = createServiceClient()

  // Fetch the visit so we can revert membership counters
  const { data: visit } = await supabase
    .from('visits')
    .select('id, membership_id, session_type, visited_at')
    .eq('id', visitId)
    .eq('client_id', clientId)
    .single()

  if (!visit) throw new Error('Visit not found')

  // Revert membership counters if this visit consumed one
  if (visit.membership_id) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('id, sessions_used_this_month, rollover_sessions, sessions_remaining, membership_plans(plan_type)')
      .eq('id', visit.membership_id)
      .single()

    if (membership) {
      const planType = (membership.membership_plans as unknown as { plan_type: string } | null)?.plan_type

      if (planType === 'pack' && visit.session_type === 'included') {
        await supabase
          .from('memberships')
          .update({ sessions_remaining: (membership.sessions_remaining ?? 0) + 1 })
          .eq('id', visit.membership_id)
      } else if (planType !== 'pack') {
        if (visit.session_type === 'included') {
          await supabase
            .from('memberships')
            .update({ sessions_used_this_month: Math.max(0, membership.sessions_used_this_month - 1) })
            .eq('id', visit.membership_id)
        } else if (visit.session_type === 'rollover') {
          await supabase
            .from('memberships')
            .update({ rollover_sessions: membership.rollover_sessions + 1 })
            .eq('id', visit.membership_id)
        }
      }
    }
  }

  // Delete the associated payment: first try by visit_id FK, then fall back to date match
  const { data: paymentByVisit } = await supabase
    .from('payments')
    .select('id')
    .eq('visit_id', visitId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (paymentByVisit) {
    await supabase.from('payments').delete().eq('id', paymentByVisit.id)
  } else {
    // Fallback for older visits without visit_id: match by date + standalone payment
    const visitDate = visit.visited_at.split('T')[0]
    const { data: paymentByDate } = await supabase
      .from('payments')
      .select('id')
      .eq('client_id', clientId)
      .is('visit_id', null)
      .is('membership_id', null)
      .eq('paid_at', visitDate)
      .in('concept', ['additional_visit', 'post_op_visit'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (paymentByDate) {
      await supabase.from('payments').delete().eq('id', paymentByDate.id)
    }
  }

  const { error } = await supabase.from('visits').delete().eq('id', visitId)
  if (error) throw new Error('Failed to delete visit')

  revalidatePath(`/admin/clients/${clientId}`)
}

export async function assignVisitToMembership(
  visitId: string,
  clientId: string,
  membershipId: string,
): Promise<void> {
  await requireAdmin()
  const supabase = createServiceClient()

  // Fetch the visit
  const { data: visit } = await supabase
    .from('visits')
    .select('id, membership_id, session_type, visited_at, client_id')
    .eq('id', visitId)
    .eq('client_id', clientId)
    .single()

  if (!visit) throw new Error('Visit not found')
  if (visit.membership_id !== null) throw new Error('Visit is already assigned to a membership')

  // Fetch the active membership with plan details
  const { data: membership } = await supabase
    .from('memberships')
    .select('id, status, sessions_used_this_month, rollover_sessions, sessions_remaining, membership_plans(plan_type, sessions_per_month, price_usd, additional_price_usd)')
    .eq('id', membershipId)
    .eq('client_id', clientId)
    .single()

  if (!membership || membership.status !== 'active') throw new Error('Membership not active')

  const plan = membership.membership_plans as unknown as {
    plan_type: string
    sessions_per_month: number
    price_usd: number
    additional_price_usd: number | null
  } | null

  if (!plan) throw new Error('Plan not found')

  const isPack = plan.plan_type === 'pack'
  const hasSessionsAvailable = isPack
    ? (membership.sessions_remaining ?? 0) > 0
    : membership.sessions_used_this_month < plan.sessions_per_month

  const newSessionType = hasSessionsAvailable ? 'included' : 'additional'

  // Update the visit
  await supabase
    .from('visits')
    .update({ membership_id: membershipId, session_type: newSessionType })
    .eq('id', visitId)

  // Update membership counters
  if (hasSessionsAvailable) {
    if (isPack) {
      await supabase
        .from('memberships')
        .update({ sessions_remaining: (membership.sessions_remaining ?? 0) - 1 })
        .eq('id', membershipId)
    } else {
      await supabase
        .from('memberships')
        .update({ sessions_used_this_month: membership.sessions_used_this_month + 1 })
        .eq('id', membershipId)
    }
  }

  // Find the existing payment (by visit_id FK first, then date fallback)
  const { data: paymentByVisit } = await supabase
    .from('payments')
    .select('id, amount_usd')
    .eq('visit_id', visitId)
    .eq('client_id', clientId)
    .maybeSingle()

  let existingPaymentId = paymentByVisit?.id ?? null

  if (!existingPaymentId) {
    const visitDate = visit.visited_at.split('T')[0]
    const { data: paymentByDate } = await supabase
      .from('payments')
      .select('id, amount_usd')
      .eq('client_id', clientId)
      .is('visit_id', null)
      .is('membership_id', null)
      .eq('paid_at', visitDate)
      .in('concept', ['additional_visit', 'post_op_visit'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    existingPaymentId = paymentByDate?.id ?? null
  }

  if (hasSessionsAvailable) {
    // Session is included — remove the separate payment (visit is now free)
    if (existingPaymentId) {
      await supabase.from('payments').delete().eq('id', existingPaymentId)
    }
  } else {
    // Additional visit — update payment to the membership's additional price
    const additionalPrice = plan.additional_price_usd ?? plan.price_usd
    if (existingPaymentId) {
      await supabase
        .from('payments')
        .update({ amount_usd: additionalPrice, membership_id: membershipId, concept: 'additional_visit' })
        .eq('id', existingPaymentId)
    } else {
      // No existing payment — create one
      await supabase.from('payments').insert({
        client_id: clientId,
        membership_id: membershipId,
        visit_id: visitId,
        amount_usd: additionalPrice,
        method: null,
        concept: 'additional_visit',
      })
    }
  }

  revalidatePath(`/admin/clients/${clientId}`)
}
