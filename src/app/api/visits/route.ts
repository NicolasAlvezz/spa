import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { SessionType } from '@/types'

export async function POST(req: Request) {
  // Auth check — getUser() hits Supabase directly, not the stale JWT
  const authClient = await createClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    console.error('[visits] unauthorized — user:', user?.id, 'authError:', authError?.message)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: { client_id: string; membership_id: string | null } = await req.json()
  const { client_id, membership_id } = body

  if (!client_id) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
  }

  // Use service client so RLS does not block reads or writes
  const supabase = createServiceClient()

  let session_type: SessionType = 'additional'

  if (membership_id) {
    const { data: membership } = await supabase
      .from('memberships')
      .select('sessions_used_this_month, rollover_sessions, membership_plans(sessions_per_month)')
      .eq('id', membership_id)
      .single()

    if (membership) {
      // membership_plans is a related row — cast via unknown because manual DB types lack this join
      const plan = membership.membership_plans as unknown as { sessions_per_month: number } | null
      const sessionsPerMonth = plan?.sessions_per_month ?? 1

      if (membership.sessions_used_this_month < sessionsPerMonth) {
        session_type = 'included'
      } else if (membership.rollover_sessions > 0) {
        session_type = 'rollover'
      }
      // else: 'additional' — all included + rollover sessions consumed

      const updates: { sessions_used_this_month: number; rollover_sessions?: number } = {
        sessions_used_this_month: membership.sessions_used_this_month + 1,
      }
      if (session_type === 'rollover') {
        updates.rollover_sessions = membership.rollover_sessions - 1
      }

      await supabase.from('memberships').update(updates).eq('id', membership_id)
    }
  }

  const { data: visit, error } = await supabase
    .from('visits')
    .insert({
      client_id,
      membership_id: membership_id ?? null,
      session_type,
      registered_by: user.email ?? user.id,
    })
    .select('id, visited_at, session_type')
    .single()

  if (error || !visit) {
    console.error('[POST /api/visits]', error)
    return NextResponse.json({ error: 'failed_to_register_visit' }, { status: 500 })
  }

  return NextResponse.json({
    visit_id: visit.id,
    visited_at: visit.visited_at,
    session_type: visit.session_type,
  })
}
