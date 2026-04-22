import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { SessionType } from '@/types'

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
    notes?: string
  } = await req.json()

  const { client_id, membership_id, service_type_id, notes } = body

  if (!client_id) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Post-op visit: no membership needed, just record the visit and payment
  if (body.session_type === 'post_op') {
    const { data: visit, error } = await supabase
      .from('visits')
      .insert({
        client_id,
        membership_id: null,
        session_type: 'post_op',
        service_type_id: service_type_id ?? null,
        registered_by: user.email ?? user.id,
        notes: notes ?? null,
      })
      .select('id, visited_at, session_type')
      .single()

    if (error || !visit) {
      console.error('[POST /api/visits] post_op insert error:', error)
      return NextResponse.json({ error: 'failed_to_register_visit' }, { status: 500 })
    }

    return NextResponse.json({
      visit_id: visit.id,
      visited_at: visit.visited_at,
      session_type: visit.session_type,
    })
  }

  let session_type: SessionType = 'additional'

  if (membership_id) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('sessions_used_this_month, rollover_sessions, sessions_remaining, split_payment_pending, membership_plans(sessions_per_month, plan_type, total_sessions)')
      .eq('id', membership_id)
      .single()

    if (membership) {
      const plan = membership.membership_plans as unknown as {
        sessions_per_month: number
        plan_type: string
        total_sessions: number | null
      } | null

      const isPack = plan?.plan_type === 'pack'

      if (isPack) {
        const sessionsRemaining = membership.sessions_remaining ?? 0
        const totalSessions = plan?.total_sessions ?? 0

        // Sessions used so far = total - remaining
        const sessionsUsed = totalSessions - sessionsRemaining

        // Block the 5th session if split payment is still pending
        if (membership.split_payment_pending && sessionsUsed >= 4) {
          return NextResponse.json(
            { error: 'split_payment_required', sessions_used: sessionsUsed },
            { status: 402 }
          )
        }

        if (sessionsRemaining <= 0) {
          return NextResponse.json({ error: 'no_sessions_remaining' }, { status: 400 })
        }

        session_type = 'included'
        const newRemaining = sessionsRemaining - 1

        const updates: { sessions_remaining: number; status?: 'expired' } = {
          sessions_remaining: newRemaining,
        }
        if (newRemaining === 0) {
          updates.status = 'expired'
        }

        await supabase.from('memberships').update(updates).eq('id', membership_id)

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

        await supabase.from('memberships').update(updates).eq('id', membership_id)
      }
    }
  }

  const { data: visit, error } = await supabase
    .from('visits')
    .insert({
      client_id,
      membership_id: membership_id ?? null,
      session_type,
      service_type_id: service_type_id ?? null,
      registered_by: user.email ?? user.id,
      notes: notes ?? null,
    })
    .select('id, visited_at, session_type')
    .single()

  if (error || !visit) {
    console.error('[POST /api/visits]', error)
    return NextResponse.json({ error: 'failed_to_register_visit' }, { status: 500 })
  }

  // After registering, check if this was the 4th session on a pack with split pending
  // to include a warning in the response
  let split_payment_warning = false
  if (membership_id) {
    const { data: updatedMembership } = await supabase
      .from('memberships')
      .select('sessions_remaining, split_payment_pending, membership_plans(plan_type, total_sessions)')
      .eq('id', membership_id)
      .single()

    if (updatedMembership) {
      const plan = updatedMembership.membership_plans as unknown as { plan_type: string; total_sessions: number | null } | null
      if (plan?.plan_type === 'pack' && updatedMembership.split_payment_pending) {
        const totalSessions = plan.total_sessions ?? 0
        const sessionsUsed = totalSessions - (updatedMembership.sessions_remaining ?? 0)
        // Warn after 4th session (next visit will be blocked)
        if (sessionsUsed === 4) {
          split_payment_warning = true
        }
      }
    }
  }

  return NextResponse.json({
    visit_id: visit.id,
    visited_at: visit.visited_at,
    session_type: visit.session_type,
    split_payment_warning,
  })
}
