import { createServiceClient } from '@/lib/supabase/server'
import type {
  ClientListRow,
  ClientDetail,
  VisitWithService,
  DbMembershipPlan,
  DbPayment,
} from '@/types'

export type { ClientListRow, ClientDetail, MembershipWithPlan, VisitWithService } from '@/types'

// ── Admin queries — use service client to bypass RLS ─────────────────────────
// These are called exclusively from admin server components that are already
// protected by middleware. Using service client avoids JWT-staleness issues
// (e.g. app_metadata.role set in Supabase but not yet reflected in the session JWT).

export async function getClients(): Promise<ClientListRow[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`*, memberships(*, membership_plans(*))`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as ClientListRow[]
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

export async function getClientVisits(clientId: string, since?: string): Promise<VisitWithService[]> {
  const supabase = createServiceClient()
  const query = supabase
    .from('visits')
    .select(`*, service_types(slug, name_en, name_es)`)
    .eq('client_id', clientId)
    .order('visited_at', { ascending: false })

  const { data, error } = since
    ? await query.gte('visited_at', since)
    : await query.limit(200)

  if (error) throw error
  return (data ?? []) as unknown as VisitWithService[]
}

export async function getClientPayments(clientId: string): Promise<DbPayment[]> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('client_id', clientId)
    .order('paid_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data ?? []
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

// ── Client-facing query — uses service client ────────────────────────────────
// Auth is always verified by the caller (getUser()) before this is called,
// so service client is safe and avoids RLS policy issues on the clients table.

export async function getClientByUserId(userId: string): Promise<ClientDetail | null> {
  const supabase = createServiceClient()

  console.log('[getClientByUserId] looking up userId:', userId)

  const { data, error } = await supabase
    .from('clients')
    .select(`*, memberships(*, membership_plans(*))`)
    .eq('user_id', userId)
    .single()

  console.log('[getClientByUserId] result:', { found: !!data, error: error?.message ?? null })

  if (error) return null
  return data as unknown as ClientDetail
}
