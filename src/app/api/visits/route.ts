import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { CONSENT_WINDOW_MS } from '@/lib/constants/consent'
import { isValidTherapistName } from '@/lib/constants/therapists'
import type { SessionType } from '@/types'

type VisitInsertRow = {
  client_id: string
  membership_id: string | null
  session_type: SessionType
  service_type_id: string | null
  payment_method: string | null
  registered_by: string
  notes: string | null
  therapist_name?: string | null
}

function isMissingTherapistColumn(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return msg.includes('therapist_name') || error.code === 'PGRST204'
}

async function insertVisit(
  supabase: ReturnType<typeof createServiceClient>,
  row: VisitInsertRow,
) {
  const { therapist_name, ...base } = row
  const withTherapist = { ...base, therapist_name: therapist_name?.trim() ?? null }

  let result = await supabase
    .from('visits')
    .insert(withTherapist)
    .select('id, visited_at, session_type')
    .single()

  if (result.error && isMissingTherapistColumn(result.error)) {
    console.warn(
      '[visits] therapist_name column missing — retrying without it. Apply migration 20260611120000_visits_therapist_name.sql',
    )
    result = await supabase
      .from('visits')
      .insert(base)
      .select('id, visited_at, session_type')
      .single()
  }

  return result
}

async function getActiveConsent(
  supabase: ReturnType<typeof createServiceClient>,
  clientId: string,
): Promise<string | null> {
  const windowStart = new Date(Date.now() - CONSENT_WINDOW_MS).toISOString()
  const { data } = await supabase
    .from('consent_acceptances')
    .select('id')
    .eq('client_id', clientId)
    .is('consumed_at', null)
    .gte('accepted_at', windowStart)
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

async function consumeConsent(
  supabase: ReturnType<typeof createServiceClient>,
  consentId: string,
  visitId: string,
) {
  const { error } = await supabase
    .from('consent_acceptances')
    .update({ consumed_at: new Date().toISOString(), consumed_by_visit: visitId })
    .eq('id', consentId)
  if (error) console.warn('[visits] failed to consume consent:', error.message)
}

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    console.error('[visits] unauthorized — user:', user?.id, 'authError:', authError?.message)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: {
    client_id: string
    membership_id: string | null
    session_type?: SessionType
    service_type_id?: string
    amount_usd?: number
    notes?: string
    therapist_name?: string
  } = await req.json()

  const { client_id, membership_id, service_type_id, amount_usd, notes, therapist_name } = body

  if (!client_id) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
  }

  if (therapist_name !== undefined && !isValidTherapistName(therapist_name)) {
    return NextResponse.json({ error: 'invalid_therapist_name' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Require active consent before registering any visit
  const consentId = await getActiveConsent(supabase, client_id)
  if (!consentId) {
    return NextResponse.json({ error: 'consent_required' }, { status: 403 })
  }

  // Post-op visit: no membership needed, just record the visit and payment
  if (body.session_type === 'post_op') {
    const { data: visit, error } = await insertVisit(supabase, {
      client_id,
      membership_id: null,
      session_type: 'post_op',
      service_type_id: service_type_id ?? null,
      payment_method: null,
      registered_by: user.email ?? user.id,
      notes: notes ?? null,
      therapist_name: therapist_name ?? null,
    })

    if (error || !visit) {
      console.error('[POST /api/visits] post_op insert error:', error?.message, error?.code, error?.details)
      return NextResponse.json({ error: 'failed_to_register_visit' }, { status: 500 })
    }

    await consumeConsent(supabase, consentId, visit.id)

    return NextResponse.json({
      visit_id: visit.id,
      visited_at: visit.visited_at,
      session_type: visit.session_type,
    })
  }

  let session_type: SessionType = 'additional'
  let updatedSessionsRemaining: number | null = null
  let splitPaymentWarning = false

  if (membership_id) {
    // Peek at plan_type so we can dispatch to the pack RPC (atomic) or the monthly path.
    const { data: membership } = await supabase
      .from('memberships')
      .select('sessions_used_this_month, rollover_sessions, membership_plans(sessions_per_month, plan_type)')
      .eq('id', membership_id)
      .single()

    if (membership) {
      const plan = membership.membership_plans as unknown as {
        sessions_per_month: number
        plan_type: string
      } | null

      const isPack = plan?.plan_type === 'pack'

      if (isPack) {
        // Atomic decrement + threshold check via Postgres function.
        // Serializes concurrent visits on the same membership so we can't
        // burn a session twice for the same physical visit.
        const { data: rpcRows, error: rpcError } = await supabase.rpc('consume_pack_session', {
          p_membership_id: membership_id,
        })

        if (rpcError) {
          if (rpcError.code === 'P0003') {
            return NextResponse.json({ error: 'split_payment_required' }, { status: 402 })
          }
          if (rpcError.code === 'P0002') {
            return NextResponse.json({ error: 'no_sessions_remaining' }, { status: 400 })
          }
          if (rpcError.code === 'P0001') {
            return NextResponse.json({ error: 'membership_not_found' }, { status: 404 })
          }
          console.error('[visits] consume_pack_session error:', rpcError)
          return NextResponse.json({ error: 'failed_to_update_membership' }, { status: 500 })
        }

        const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
        if (!row) {
          return NextResponse.json({ error: 'failed_to_update_membership' }, { status: 500 })
        }
        session_type = 'included'
        updatedSessionsRemaining = row.sessions_remaining as number
        splitPaymentWarning = !!row.split_payment_warning
      } else {
        // Monthly plan logic
        const sessionsPerMonth = plan?.sessions_per_month ?? 1

        if (membership.sessions_used_this_month < sessionsPerMonth) {
          session_type = 'included'
        } else if (membership.rollover_sessions > 0) {
          session_type = 'rollover'
        }

        const updates: { sessions_used_this_month: number; rollover_sessions?: number } = {
          sessions_used_this_month: membership.sessions_used_this_month + 1,
        }
        if (session_type === 'rollover') {
          updates.rollover_sessions = membership.rollover_sessions - 1
        }

        const { error: monthlyUpdateError } = await supabase
          .from('memberships')
          .update(updates)
          .eq('id', membership_id)
        if (monthlyUpdateError) {
          console.error('[visits] monthly membership update error:', monthlyUpdateError)
          return NextResponse.json({ error: 'failed_to_update_membership' }, { status: 500 })
        }
      }
    }
  }

  const { data: visit, error } = await insertVisit(supabase, {
    client_id,
    membership_id: membership_id ?? null,
    session_type,
    service_type_id: service_type_id ?? null,
    payment_method: null,
    registered_by: user.email ?? user.id,
    notes: notes ?? null,
    therapist_name: therapist_name ?? null,
  })

  if (error || !visit) {
    console.error('[POST /api/visits] insert error:', error?.message, error?.code, error?.details)
    return NextResponse.json({ error: 'failed_to_register_visit' }, { status: 500 })
  }

  await consumeConsent(supabase, consentId, visit.id)

  // Create a payment record for additional visits that come with a price
  if (session_type === 'additional' && amount_usd && amount_usd > 0) {
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        client_id,
        membership_id: membership_id ?? null,
        amount_usd,
        method: null,
        concept: 'additional_visit',
      })
    if (paymentError) {
      console.error('[visits] failed to create additional visit payment:', paymentError)
    }
  }

  return NextResponse.json({
    visit_id: visit.id,
    visited_at: visit.visited_at,
    session_type: visit.session_type,
    split_payment_warning: splitPaymentWarning,
    sessions_remaining: updatedSessionsRemaining,
  })
}
