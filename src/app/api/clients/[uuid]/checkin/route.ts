import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getMembershipStatus, getCurrentMembership } from '@/lib/utils/membership'
import type { CheckinResult, MembershipWithPlan } from '@/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: Request,
  { params }: { params: { uuid: string } }
) {
  // Auth check — getUser() hits Supabase directly, not the stale JWT
  const authClient = await createClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    console.error('[checkin] unauthorized — user:', user?.id, 'role:', user?.app_metadata?.role, 'authError:', authError?.message)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { uuid } = params
  console.log('[checkin] uuid received:', uuid)

  if (!UUID_RE.test(uuid)) {
    console.error('[checkin] invalid uuid format:', uuid)
    return NextResponse.json({ error: 'invalid_uuid' }, { status: 400 })
  }

  // Use service client so RLS does not block the read (same pattern as admin queries)
  const supabase = createServiceClient()

  // Client + memberships
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, phone, preferred_language, memberships(*, membership_plans(*))')
    .eq('id', uuid)
    .single()

  console.log('[checkin] query result — client:', client?.id ?? null, 'error:', error?.message ?? null)

  if (error || !client) {
    return NextResponse.json({ error: 'client_not_found' }, { status: 404 })
  }

  const memberships = (client.memberships ?? []) as unknown as MembershipWithPlan[]
  const membership = getCurrentMembership(memberships)
  const membership_status = getMembershipStatus(membership)

  // Visits this calendar month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [{ data: visits }, { data: lastPaymentArr }] = await Promise.all([
    supabase
      .from('visits')
      .select('*')
      .eq('client_id', uuid)
      .gte('visited_at', startOfMonth.toISOString())
      .order('visited_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('client_id', uuid)
      .order('paid_at', { ascending: false })
      .limit(1),
  ])

  const isPack = membership?.membership_plans?.plan_type === 'pack'
  const sessionsUsed = isPack
    ? (membership?.membership_plans?.total_sessions ?? 0) - (membership?.sessions_remaining ?? 0)
    : (membership?.sessions_used_this_month ?? 0)

  const result: CheckinResult = {
    client: {
      id: client.id,
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone,
      preferred_language: client.preferred_language,
    },
    membership,
    membership_status,
    sessions_used_this_month: sessionsUsed,
    rollover_sessions: isPack ? 0 : (membership?.rollover_sessions ?? 0),
    visits_this_month: visits ?? [],
    last_payment: lastPaymentArr?.[0] ?? null,
  }

  return NextResponse.json(result)
}
