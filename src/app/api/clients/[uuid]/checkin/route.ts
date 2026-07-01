import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getMembershipStatus, getCurrentMembership } from '@/lib/utils/membership'
import { CONSENT_WINDOW_MS } from '@/lib/constants/consent'
import { todayInSpaTz, spaTzOffset } from '@/lib/utils/dates'
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

  if (!UUID_RE.test(uuid)) {
    return NextResponse.json({ error: 'invalid_uuid' }, { status: 400 })
  }

  // Use service client so RLS does not block the read (same pattern as admin queries)
  const supabase = createServiceClient()

  // Client + memberships
  const { data: client, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, phone, preferred_language, notes, memberships(*, membership_plans(*))')
    .eq('id', uuid)
    .single()

  if (error || !client) {
    return NextResponse.json({ error: 'client_not_found' }, { status: 404 })
  }

  const memberships = (client.memberships ?? []) as unknown as MembershipWithPlan[]
  const membership = getCurrentMembership(memberships)
  const membership_status = getMembershipStatus(membership)

  // Use the spa's local timezone (America/New_York) for day/month boundaries
  // so visits near midnight don't land in the wrong day or month.
  const todayNY = todayInSpaTz()
  const offset = spaTzOffset()
  const monthStartNY = todayNY.substring(0, 7) + '-01'

  const startOfMonth = `${monthStartNY}T00:00:00${offset}`
  const todayStart = `${todayNY}T00:00:00${offset}`
  const todayEnd = `${todayNY}T23:59:59.999${offset}`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any

  const consentWindowStart = new Date(Date.now() - CONSENT_WINDOW_MS).toISOString()

  const [visitsRes, paymentsRes, apptRes, lastVisitRes, consentRes] = await Promise.all([
    supabase
      .from('visits')
      .select('*')
      .eq('client_id', uuid)
      .gte('visited_at', startOfMonth)
      .order('visited_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('client_id', uuid)
      .order('paid_at', { ascending: false })
      .limit(1),
    supabaseAny
      .from('appointments')
      .select('id, scheduled_at, notes, service_types(name_en, name_es)')
      .eq('client_id', uuid)
      .eq('status', 'scheduled')
      .gte('scheduled_at', todayStart)
      .lte('scheduled_at', todayEnd)
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('visits')
      .select('visited_at, service_types(name_en, name_es)')
      .eq('client_id', uuid)
      .order('visited_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('consent_acceptances')
      .select('id')
      .eq('client_id', uuid)
      .is('consumed_at', null)
      .gte('accepted_at', consentWindowStart)
      .limit(1)
      .maybeSingle(),
  ])

  if (visitsRes.error) console.error('[checkin] visits query error:', visitsRes.error)
  if (paymentsRes.error) console.error('[checkin] payments query error:', paymentsRes.error)
  if (apptRes.error) console.error('[checkin] appointments query error:', apptRes.error)
  if (consentRes.error) console.error('[checkin] consent query error:', consentRes.error)

  const visits = visitsRes.data
  const lastPaymentArr = paymentsRes.data
  const todayAppt = apptRes.data
  const hasActiveConsent = consentRes.data !== null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastVisitData = lastVisitRes.data as any

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notes: (client as any).notes ?? null,
    },
    membership,
    membership_status,
    sessions_used_this_month: sessionsUsed,
    rollover_sessions: isPack ? 0 : (membership?.rollover_sessions ?? 0),
    visits_this_month: visits ?? [],
    last_payment: lastPaymentArr?.[0] ?? null,
    last_visit: lastVisitData
      ? {
          visited_at: lastVisitData.visited_at,
          service_name_en: lastVisitData.service_types?.name_en ?? null,
          service_name_es: lastVisitData.service_types?.name_es ?? null,
        }
      : null,
    has_active_consent: hasActiveConsent,
    today_appointment: todayAppt
      ? {
          id: todayAppt.id,
          scheduled_at: todayAppt.scheduled_at,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          service_name_en: (todayAppt.service_types as any)?.name_en ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          service_name_es: (todayAppt.service_types as any)?.name_es ?? null,
          notes: todayAppt.notes ?? null,
        }
      : null,
  }

  return NextResponse.json(result)
}
