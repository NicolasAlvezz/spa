import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

type MembershipPlanRow = Database['public']['Tables']['membership_plans']['Row']
type MembershipRow = Database['public']['Tables']['memberships']['Row']
type ClientRow = Database['public']['Tables']['clients']['Row']
type VisitRow = Database['public']['Tables']['visits']['Row']
type PaymentRow = Database['public']['Tables']['payments']['Row']

// ─── Shared nested types ─────────────────────────────────────────────────────

export type MembershipWithPlan = MembershipRow & {
  membership_plans: MembershipPlanRow | null
}

// ─── Client list ─────────────────────────────────────────────────────────────

export type ClientListRow = ClientRow & {
  memberships: MembershipWithPlan[]
}

export async function getClients(): Promise<ClientListRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      memberships(
        *,
        membership_plans(*)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as ClientListRow[]
}

// ─── Client detail ────────────────────────────────────────────────────────────

export type ClientDetail = ClientRow & {
  memberships: MembershipWithPlan[]
}

export async function getClientById(id: string): Promise<ClientDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      memberships(
        *,
        membership_plans(*)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as unknown as ClientDetail
}

// ─── Visits ──────────────────────────────────────────────────────────────────

export type VisitWithService = VisitRow & {
  service_types: { slug: string; name_en: string; name_es: string } | null
}

export async function getClientVisits(clientId: string): Promise<VisitWithService[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('visits')
    .select(`*, service_types(slug, name_en, name_es)`)
    .eq('client_id', clientId)
    .order('visited_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return (data ?? []) as unknown as VisitWithService[]
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function getClientPayments(clientId: string): Promise<PaymentRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('client_id', clientId)
    .order('paid_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return data ?? []
}

// ─── Membership plans (for form selects) ─────────────────────────────────────

export async function getActivePlans(): Promise<MembershipPlanRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_usd')

  if (error) throw error
  return data ?? []
}

// ─── Helper: pick the "current" membership ───────────────────────────────────
// Returns the active membership, or the most recent one if none is active.

export function getCurrentMembership(
  memberships: MembershipWithPlan[]
): MembershipWithPlan | null {
  if (!memberships.length) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const active = memberships.find(
    (m) => m.status !== 'cancelled' && new Date(m.expires_at) >= today
  )
  if (active) return active

  return [...memberships].sort(
    (a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime()
  )[0] ?? null
}
