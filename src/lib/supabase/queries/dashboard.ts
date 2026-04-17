import { createServiceClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Timezone utility — business is in Kissimmee, FL (America/New_York)
// ---------------------------------------------------------------------------

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

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createServiceClient()

  const now   = new Date()
  const today = now.toISOString().split('T')[0]
  const nextWeek = new Date(now.getTime() + 7 * 86_400_000).toISOString().split('T')[0]
  const monthStart = startOfMonthET()

  const [
    { count: activeClients },
    { count: visitsThisMonth },
    { data: payments },
    { count: expiringThisWeek },
  ] = await Promise.all([
    supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('expires_at', today),

    supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .gte('visited_at', monthStart),

    supabase
      .from('payments')
      .select('amount_usd')
      .gte('paid_at', today.slice(0, 7) + '-01'), // first day of month (DATE)

    supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('expires_at', today)
      .lte('expires_at', nextWeek),
  ])

  const revenueThisMonth = (payments ?? []).reduce(
    (sum, p) => sum + Number(p.amount_usd), 0
  )

  return {
    activeClients:    activeClients ?? 0,
    visitsThisMonth:  visitsThisMonth ?? 0,
    revenueThisMonth,
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
