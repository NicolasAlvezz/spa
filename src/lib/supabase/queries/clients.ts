import { createServiceClient } from '@/lib/supabase/server'
import { CONSENT_WINDOW_MS } from '@/lib/constants/consent'
import type {
  ClientListRow,
  ClientDetail,
  VisitWithServiceAndConsent,
  DbMembershipPlan,
  DbPayment,
} from '@/types'

export type { ClientListRow, ClientDetail, MembershipWithPlan, VisitWithServiceAndConsent } from '@/types'

// ── Admin queries — use service client to bypass RLS ─────────────────────────
// These are called exclusively from admin server components that are already
// protected by middleware. Using service client avoids JWT-staleness issues
// (e.g. app_metadata.role set in Supabase but not yet reflected in the session JWT).

export async function getClients(opts?: { includeInactive?: boolean }): Promise<ClientListRow[]> {
  const supabase = createServiceClient()
  const query = supabase
    .from('clients')
    .select(`*, memberships(*, membership_plans(*))`)
    .order('created_at', { ascending: false })

  const { data, error } = opts?.includeInactive
    ? await query
    : await query.eq('is_active', true)

  if (error) throw error
  return (data ?? []) as unknown as ClientListRow[]
}

export interface ClientHistorySummary {
  memberships: number
  visits: number
  payments: number
}

export async function getClientHistorySummary(clientId: string): Promise<ClientHistorySummary> {
  const supabase = createServiceClient()
  const [{ count: memberships }, { count: visits }, { count: payments }] = await Promise.all([
    supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    supabase.from('visits').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
  ])
  return {
    memberships: memberships ?? 0,
    visits: visits ?? 0,
    payments: payments ?? 0,
  }
}

export async function getClientById(id: string): Promise<ClientDetail | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`*, memberships(*, membership_plans(*))`)
    .eq('id', id)
    .single()

  if (error) return null
  return data as unknown as ClientDetail
}

export async function getClientVisits(clientId: string, since?: string): Promise<VisitWithServiceAndConsent[]> {
  const supabase = createServiceClient()
  const query = supabase
    .from('visits')
    .select(`
      *,
      service_types(slug, name_en, name_es, price_usd),
      consent_acceptance:consent_acceptances!consumed_by_visit(id, accepted_at, language, version)
    `)
    .eq('client_id', clientId)
    .order('visited_at', { ascending: false })

  const { data, error } = since
    ? await query.gte('visited_at', since)
    : await query.limit(200)

  if (error) throw error
  return (data ?? []) as unknown as VisitWithServiceAndConsent[]
}

/**
 * Returns true if the client has a recent unconsumed consent acceptance
 * within CONSENT_WINDOW_MS (the same window used when associating consent→visit).
 */
export async function getActiveConsentForClient(clientId: string): Promise<boolean> {
  const supabase = createServiceClient()
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
  return data !== null
}

export async function getServiceVisitsTotalPaid(clientId: string): Promise<number> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('visits')
    .select('service_types(price_usd)')
    .eq('client_id', clientId)
    .is('membership_id', null)
    .not('service_type_id', 'is', null)

  if (!data) return 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).reduce((sum, v) => sum + Number(v.service_types?.price_usd ?? 0), 0)
}

export type PaymentWithContract = DbPayment & {
  membership_request_id: string | null
}

export async function getClientPayments(clientId: string): Promise<PaymentWithContract[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*, memberships(membership_request_id)')
    .eq('client_id', clientId)
    .order('paid_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return ((data ?? []) as unknown as Array<DbPayment & { memberships: { membership_request_id: string | null } | null }>).map(p => ({
    ...p,
    membership_request_id: p.memberships?.membership_request_id ?? null,
  }))
}

export async function getActivePlans(): Promise<DbMembershipPlan[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_usd')

  if (error) throw error
  return data ?? []
}

export interface ClientSelectItem {
  id: string
  first_name: string
  last_name: string
}

export async function getClientSelectList(): Promise<ClientSelectItem[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name')
    .order('first_name')

  if (error) throw error
  return (data ?? []) as ClientSelectItem[]
}

export interface ServiceTypeItem {
  id: string
  slug: string
  name_en: string
  name_es: string
  duration_minutes: number
  price_usd: number | null
  description_en: string | null
  description_es: string | null
}

export interface ServiceTypeAdminItem extends ServiceTypeItem {
  is_active: boolean
  created_at: string
}

export async function getServiceTypes(): Promise<ServiceTypeItem[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('service_types')
    .select('id, slug, name_en, name_es, duration_minutes, price_usd, description_en, description_es')
    .eq('is_active', true)
    .order('name_en')

  if (error) throw error
  return (data ?? []) as unknown as ServiceTypeItem[]
}

export async function getAllServiceTypes(): Promise<ServiceTypeAdminItem[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('service_types')
    .select('id, slug, name_en, name_es, duration_minutes, price_usd, description_en, description_es, is_active, created_at')
    .order('name_en')

  if (error) throw error
  return (data ?? []) as unknown as ServiceTypeAdminItem[]
}

export async function getAllMembershipPlans(): Promise<DbMembershipPlan[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .order('price_usd')
  if (error) throw error
  return data ?? []
}

// ── Client-facing query — uses service client ────────────────────────────────
// Auth is always verified by the caller (getUser()) before this is called,
// so service client is safe and avoids RLS policy issues on the clients table.

export async function getClientByUserId(userId: string): Promise<ClientDetail | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('clients')
    .select(`*, memberships(*, membership_plans(*))`)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('[getClientByUserId]', error.message)
    return null
  }
  return data as unknown as ClientDetail
}
