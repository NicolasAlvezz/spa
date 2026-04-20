import { createServiceClient } from '@/lib/supabase/server'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClientNextAppointment {
  id: string
  scheduled_at: string
  service_name_en: string | null
  service_name_es: string | null
  notes: string | null
}

export interface ClientVisitRow {
  id: string
  visited_at: string
  session_type: string
  service_name_en: string | null
  service_name_es: string | null
}

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Returns the next upcoming scheduled appointment for a client.
 * Uses service client + explicit clientId filter (clientId is always
 * obtained from a prior RLS-verified getClientByUserId call).
 */
export async function getClientNextAppointment(
  clientId: string
): Promise<ClientNextAppointment | null> {
  // appointments table is not in the manual DB types — cast to bypass
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const now = new Date().toISOString()

  const { data } = await supabase
    .from('appointments')
    .select('id, scheduled_at, notes, service_types(name_en, name_es)')
    .eq('client_id', clientId)
    .eq('status', 'scheduled')
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  return {
    id: data.id,
    scheduled_at: data.scheduled_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service_name_en: (data.service_types as any)?.name_en ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service_name_es: (data.service_types as any)?.name_es ?? null,
    notes: data.notes ?? null,
  }
}

/**
 * Returns the N most recent visits for a client (default 5).
 */
export async function getClientRecentVisits(
  clientId: string,
  limit = 5
): Promise<ClientVisitRow[]> {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('visits')
    .select('id, visited_at, session_type, service_types(name_en, name_es)')
    .eq('client_id', clientId)
    .order('visited_at', { ascending: false })
    .limit(limit)

  if (!data) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((v: any) => ({
    id: v.id,
    visited_at: v.visited_at,
    session_type: v.session_type,
    service_name_en: v.service_types?.name_en ?? null,
    service_name_es: v.service_types?.name_es ?? null,
  }))
}

/**
 * Returns paginated visits for a client.
 * page is 1-based.
 */
export async function getClientVisitsPaginated(
  clientId: string,
  page: number,
  pageSize = 20
): Promise<{ visits: ClientVisitRow[]; total: number }> {
  const supabase = createServiceClient()
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const [dataRes, countRes] = await Promise.all([
    supabase
      .from('visits')
      .select('id, visited_at, session_type, service_types(name_en, name_es)')
      .eq('client_id', clientId)
      .order('visited_at', { ascending: false })
      .range(from, to),
    supabase
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visits = (dataRes.data ?? []).map((v: any) => ({
    id: v.id,
    visited_at: v.visited_at,
    session_type: v.session_type,
    service_name_en: v.service_types?.name_en ?? null,
    service_name_es: v.service_types?.name_es ?? null,
  }))

  return { visits, total: countRes.count ?? 0 }
}

/**
 * Updates editable client profile fields.
 * clientId must be obtained from a prior auth-verified getClientByUserId call.
 */
export async function updateClientProfile(
  clientId: string,
  data: { phone: string; email: string | null; preferred_language: 'en' | 'es' }
): Promise<{ error: string | null }> {
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('clients')
    .update({
      phone: data.phone,
      email: data.email || null,
      preferred_language: data.preferred_language,
    })
    .eq('id', clientId)

  return { error: error?.message ?? null }
}
