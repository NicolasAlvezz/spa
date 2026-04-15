import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMembershipStatus, getCurrentMembership } from '@/lib/utils/membership'
import type { CheckinResult, MembershipWithPlan } from '@/types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: Request,
  { params }: { params: { uuid: string } }
) {
  const supabase = await createClient()

  // Admin-only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { uuid } = params
  if (!UUID_RE.test(uuid)) {
    return NextResponse.json({ error: 'invalid_uuid' }, { status: 400 })
  }

  // Client + memberships
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, phone, preferred_language, memberships(*, membership_plans(*))')
    .eq('id', uuid)
    .single()

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
    sessions_used_this_month: membership?.sessions_used_this_month ?? 0,
    rollover_sessions: membership?.rollover_sessions ?? 0,
    visits_this_month: visits ?? [],
    last_payment: lastPaymentArr?.[0] ?? null,
  }

  return NextResponse.json(result)
}
