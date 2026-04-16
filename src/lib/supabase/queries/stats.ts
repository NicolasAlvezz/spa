import { createServiceClient } from '@/lib/supabase/server'

// ─── Period helpers ───────────────────────────────────────────────────────────

export type StatsPeriod = 'all_time' | 'this_year' | 'this_month'

const TZ = 'America/New_York'

function etDateStr(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
}

/** Returns the start ISO string for the given period in Eastern Time. */
function periodStart(period: StatsPeriod): string | null {
  const now = new Date()
  if (period === 'all_time') return null

  const todayET = etDateStr(now)
  const [y, m] = todayET.split('-')

  const dateStr = period === 'this_year' ? `${y}-01-01` : `${y}-${m}-01`

  // Compute UTC equivalent of midnight ET on that date
  const midnightUTC = new Date(`${dateStr}T00:00:00Z`)
  const midnightET  = new Date(midnightUTC.toLocaleString('en-US', { timeZone: TZ }))
  const offsetMs    = midnightUTC.getTime() - midnightET.getTime()
  return new Date(midnightUTC.getTime() + offsetMs).toISOString()
}

// ─── Month-label helper for charts ───────────────────────────────────────────

/** Builds an ordered array of the last N month labels, e.g. ['May 25', …, 'Apr 26']. */
function lastNMonths(n: number): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    months.push({ key, label })
  }
  return months
}

function toMonthKey(isoDate: string) {
  return isoDate.slice(0, 7) // 'YYYY-MM'
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MonthPoint   { month: string; value: number }
export interface ConceptRow   { label: string; value: number }

export interface StatsData {
  period: StatsPeriod

  // Revenue
  revenueTotal: number
  revenueByConcept: ConceptRow[]
  revenueByMethod: ConceptRow[]
  revenueByMonth: MonthPoint[]      // last 12 months always

  // Clients
  totalClients: number
  clientsActive: number
  clientsExpired: number
  clientsNoPlan: number
  newClientsByMonth: MonthPoint[]   // last 12 months always
  clientsByHowHeard: ConceptRow[]
  healthcareWorkers: number

  // Visits
  totalVisits: number
  visitsBySessionType: ConceptRow[]
  visitsByService: ConceptRow[]     // name_en

  // Memberships
  membershipsByPlan: ConceptRow[]   // plan name_en
  completedCommitments: number
}

// ─── Main query ───────────────────────────────────────────────────────────────

export async function getStatsData(period: StatsPeriod): Promise<StatsData> {
  const supabase = createServiceClient()
  const start    = periodStart(period)
  const months12 = lastNMonths(12)

  // Fetch everything in parallel
  const [
    paymentsRes,
    clientsRes,
    visitsRes,
    membershipsRes,
  ] = await Promise.all([
    // Payments
    (start
      ? supabase.from('payments').select('amount_usd, method, concept, paid_at').gte('paid_at', start.slice(0, 10))
      : supabase.from('payments').select('amount_usd, method, concept, paid_at')
    ),

    // Clients with membership status — cast via unknown to bypass manual DB type limitations
    supabase.from('clients').select(
      'id, created_at, how_did_you_hear, is_healthcare_worker, memberships(status, expires_at, plan_id, months_committed, months_completed, membership_plans(name_en))'
    ) as unknown as Promise<{ data: any[]; error: unknown }>,

    // Visits
    (start
      ? supabase.from('visits').select('session_type, visited_at, service_types(name_en)').gte('visited_at', start)
      : supabase.from('visits').select('session_type, visited_at, service_types(name_en)')
    ),

    // All memberships for plan distribution
    supabase.from('memberships').select('plan_id, months_committed, months_completed, membership_plans(name_en)'),
  ])

  const payments    = paymentsRes.data    ?? []
  const allClients  = clientsRes.data     ?? []
  const visits      = visitsRes.data      ?? []
  const memberships = membershipsRes.data ?? []

  // ── Revenue ────────────────────────────────────────────────────────────────

  const revenueTotal = payments.reduce((s, p) => s + Number(p.amount_usd), 0)

  const conceptMap: Record<string, number> = {}
  const methodMap:  Record<string, number> = {}
  const revMonthMap: Record<string, number> = {}

  for (const p of payments) {
    conceptMap[p.concept] = (conceptMap[p.concept] ?? 0) + Number(p.amount_usd)
    methodMap[p.method]   = (methodMap[p.method]   ?? 0) + Number(p.amount_usd)
    const mk = toMonthKey(p.paid_at)
    revMonthMap[mk] = (revMonthMap[mk] ?? 0) + Number(p.amount_usd)
  }

  const conceptLabels: Record<string, string> = {
    monthly_membership: 'Monthly membership',
    additional_visit:   'Additional visit',
    welcome_offer:      'Welcome offer',
  }
  const methodLabels: Record<string, string> = {
    cash: 'Cash', debit: 'Debit', credit: 'Credit',
  }

  const revenueByConcept: ConceptRow[] = Object.entries(conceptMap).map(([k, v]) => ({
    label: conceptLabels[k] ?? k, value: v,
  }))
  const revenueByMethod: ConceptRow[] = Object.entries(methodMap).map(([k, v]) => ({
    label: methodLabels[k] ?? k, value: v,
  }))
  const revenueByMonth: MonthPoint[] = months12.map(({ key, label }) => ({
    month: label, value: revMonthMap[key] ?? 0,
  }))

  // ── Clients ────────────────────────────────────────────────────────────────

  // For period filtering of clients, filter by created_at
  const filteredClients = start
    ? allClients.filter(c => new Date(c.created_at) >= new Date(start))
    : allClients

  const totalClients = filteredClients.length

  // Determine current status per client (use most recent active/expired membership)
  let clientsActive = 0, clientsExpired = 0, clientsNoPlan = 0
  const todayStr = etDateStr(new Date())

  for (const c of allClients) {  // status uses all clients regardless of period
    const mems = (c.memberships as any[]) ?? []
    const active = mems.find(m => m.status === 'active' && m.expires_at >= todayStr)
    const anyExpired = mems.some(m => m.status === 'expired')
    if (active)          clientsActive++
    else if (anyExpired) clientsExpired++
    else                 clientsNoPlan++
  }

  // New clients by month (last 12, all time)
  const newClientsMonthMap: Record<string, number> = {}
  for (const c of allClients) {
    const mk = toMonthKey(c.created_at)
    newClientsMonthMap[mk] = (newClientsMonthMap[mk] ?? 0) + 1
  }
  const newClientsByMonth: MonthPoint[] = months12.map(({ key, label }) => ({
    month: label, value: newClientsMonthMap[key] ?? 0,
  }))

  // How they heard (filtered by period)
  const howMap: Record<string, number> = {}
  for (const c of filteredClients) {
    const h = c.how_did_you_hear ?? 'unknown'
    howMap[h] = (howMap[h] ?? 0) + 1
  }
  const clientsByHowHeard: ConceptRow[] = Object.entries(howMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const healthcareWorkers = filteredClients.filter(c => c.is_healthcare_worker).length

  // ── Visits ─────────────────────────────────────────────────────────────────

  const totalVisits = visits.length

  const sessionMap: Record<string, number> = {}
  const serviceMap: Record<string, number> = {}

  for (const v of visits) {
    sessionMap[v.session_type] = (sessionMap[v.session_type] ?? 0) + 1
    const svc = (v.service_types as any)?.name_en ?? 'Unknown'
    serviceMap[svc] = (serviceMap[svc] ?? 0) + 1
  }

  const sessionLabels: Record<string, string> = {
    included:      'Included',
    rollover:      'Rollover',
    additional:    'Additional',
    welcome_offer: 'Welcome offer',
  }
  const visitsBySessionType: ConceptRow[] = Object.entries(sessionMap).map(([k, v]) => ({
    label: sessionLabels[k] ?? k, value: v,
  }))
  const visitsByService: ConceptRow[] = Object.entries(serviceMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  // ── Memberships ────────────────────────────────────────────────────────────

  const planMap: Record<string, number> = {}
  for (const m of memberships) {
    const name = (m.membership_plans as any)?.name_en ?? 'Unknown'
    planMap[name] = (planMap[name] ?? 0) + 1
  }
  const membershipsByPlan: ConceptRow[] = Object.entries(planMap).map(([label, value]) => ({
    label, value,
  }))

  const completedCommitments = memberships.filter(
    m => (m.months_completed ?? 0) >= (m.months_committed ?? 3)
  ).length

  return {
    period,
    revenueTotal, revenueByConcept, revenueByMethod, revenueByMonth,
    totalClients, clientsActive, clientsExpired, clientsNoPlan,
    newClientsByMonth, clientsByHowHeard, healthcareWorkers,
    totalVisits, visitsBySessionType, visitsByService,
    membershipsByPlan, completedCommitments,
  }
}
