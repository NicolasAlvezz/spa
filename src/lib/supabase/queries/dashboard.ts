import { createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Timezone utility — business is in Kissimmee, FL (America/New_York)
// ---------------------------------------------------------------------------

/** Returns UTC ISO bounds for an arbitrary YYYY-MM-DD date in Eastern Time. */
export function dateBoundsET(dateStr: string): { start: string; end: string } {
  const TZ = 'America/New_York'
  const midnightUTC = new Date(`${dateStr}T00:00:00Z`)
  const midnightET  = new Date(midnightUTC.toLocaleString('en-US', { timeZone: TZ }))
  const offsetMs    = midnightUTC.getTime() - midnightET.getTime()
  const start = new Date(midnightUTC.getTime() + offsetMs)
  const end   = new Date(start.getTime() + 86_400_000)
  return { start: start.toISOString(), end: end.toISOString() }
}

/** Returns start/end UTC ISO strings for "today" in Eastern Time. */
export function todayBoundsET(): { start: string; end: string } {
  const TZ = 'America/New_York'
  const now = new Date()

  // Get today's date string in ET (reliable Intl approach)
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
  // todayStr = 'YYYY-MM-DD'

  // Compute the UTC<>ET offset by comparing a known UTC time with its ET wall-clock
  const midnightUTC = new Date(`${todayStr}T00:00:00Z`)
  const midnightET  = new Date(midnightUTC.toLocaleString('en-US', { timeZone: TZ }))
  const offsetMs    = midnightUTC.getTime() - midnightET.getTime()

  const start = new Date(midnightUTC.getTime() + offsetMs)
  const end   = new Date(start.getTime() + 86_400_000) // +24 h

  return { start: start.toISOString(), end: end.toISOString() }
}

/** Returns first-day-of-current-month UTC ISO string (Eastern Time). */
export function startOfMonthET(): string {
  const TZ = 'America/New_York'
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit',
  }).formatToParts(now)
  const year  = parts.find(p => p.type === 'year')!.value
  const month = parts.find(p => p.type === 'month')!.value
  const firstStr = `${year}-${month}-01`

  const midnightUTC = new Date(`${firstStr}T00:00:00Z`)
  const midnightET  = new Date(midnightUTC.toLocaleString('en-US', { timeZone: TZ }))
  const offsetMs    = midnightUTC.getTime() - midnightET.getTime()
  return new Date(midnightUTC.getTime() + offsetMs).toISOString()
}

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

export interface DashboardStats {
  activeClients: number
  visitsThisMonth: number
  revenueThisMonth: number
  expiringThisWeek: number
}

export async function getDashboardStats(opts?: { from?: string; to?: string }): Promise<DashboardStats> {
  const supabase = createServiceClient()

  const now   = new Date()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now)
  const nextWeek = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(
    new Date(now.getTime() + 7 * 86_400_000)
  )

  // Date range for visits/revenue — default to current month
  const rangeFrom = opts?.from ?? (today.slice(0, 7) + '-01')
  const rangeTo   = opts?.to   ?? today

  // Convert range dates to UTC bounds (ET timezone)
  const visitFrom = (() => {
    const { start } = dateBoundsET(rangeFrom)
    return start
  })()
  const visitTo = (() => {
    const { end } = dateBoundsET(rangeTo)
    return end
  })()

  const [
    { count: activeClients },
    { count: visitsInRange },
    { data: payments },
    { count: expiringThisWeek },
    { data: serviceVisits },
  ] = await Promise.all([
    supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('expires_at', today),

    supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .gte('visited_at', visitFrom)
      .lt('visited_at', visitTo),

    supabase
      .from('payments')
      .select('amount_usd')
      .gte('paid_at', rangeFrom)
      .lte('paid_at', rangeTo),

    supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('expires_at', today)
      .lte('expires_at', nextWeek),

    supabase
      .from('visits')
      .select('service_types(price_usd)')
      .is('membership_id', null)
      .not('service_type_id', 'is', null)
      .gte('visited_at', visitFrom)
      .lt('visited_at', visitTo),
  ])

  const revenueFromPayments = (payments ?? []).reduce(
    (sum, p) => sum + Number(p.amount_usd), 0
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const revenueFromServiceVisits = (serviceVisits as any[] ?? []).reduce(
    (sum, v) => sum + Number(v.service_types?.price_usd ?? 0), 0
  )
  const revenueInRange = revenueFromPayments + revenueFromServiceVisits

  return {
    activeClients:    activeClients ?? 0,
    visitsThisMonth:  visitsInRange ?? 0,
    revenueThisMonth: revenueInRange,
    expiringThisWeek: expiringThisWeek ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Today's visits & appointments
// ---------------------------------------------------------------------------

export interface TodayVisit {
  id: string
  visited_at: string
  session_type: string
  client: { first_name: string; last_name: string }
  service: { name_en: string; name_es: string } | null
}

export interface TodayAppointment {
  id: string
  scheduled_at: string
  status: string
  notes: string | null
  client: { first_name: string; last_name: string }
  service: { name_en: string; name_es: string } | null
}

export async function getTodayVisits(): Promise<TodayVisit[]> {
  const supabase = createServiceClient()
  const { start, end } = todayBoundsET()

  const { data } = await supabase
    .from('visits')
    .select('id, visited_at, session_type, clients(first_name, last_name), service_types(name_en, name_es)')
    .gte('visited_at', start)
    .lt('visited_at', end)
    .order('visited_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id:          r.id,
    visited_at:  r.visited_at,
    session_type: r.session_type,
    client: r.clients,
    service: r.service_types ?? null,
  }))
}

export async function getTodayAppointments(): Promise<TodayAppointment[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { start, end } = todayBoundsET()

  const { data } = await supabase
    .from('appointments')
    .select('id, scheduled_at, status, notes, clients(first_name, last_name), service_types(name_en, name_es)')
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .order('scheduled_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id:           r.id,
    scheduled_at: r.scheduled_at,
    status:       r.status,
    notes:        r.notes ?? null,
    client: r.clients,
    service: r.service_types ?? null,
  }))
}

// ---------------------------------------------------------------------------
// Calendar appointments (full join with phone + price + duration)
// ---------------------------------------------------------------------------

export interface CalendarAppointment {
  id: string
  scheduled_at: string
  status: string
  notes: string | null
  client: { first_name: string; last_name: string; phone: string }
  service: {
    name_en: string
    name_es: string
    price_usd: number | null
    duration_minutes: number | null
  } | null
}

export async function getCalendarAppointments(dateStr: string): Promise<CalendarAppointment[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { start, end } = dateBoundsET(dateStr)

  const { data } = await supabase
    .from('appointments')
    .select('id, scheduled_at, status, notes, clients(first_name, last_name, phone), service_types(name_en, name_es, price_usd, duration_minutes)')
    .gte('scheduled_at', start)
    .lt('scheduled_at', end)
    .order('scheduled_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id:           r.id,
    scheduled_at: r.scheduled_at,
    status:       r.status,
    notes:        r.notes ?? null,
    client:       r.clients,
    service:      r.service_types ?? null,
  }))
}
