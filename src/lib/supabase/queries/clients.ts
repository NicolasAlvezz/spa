import { createClient } from '@/lib/supabase/server'
import type {
  ClientListRow,
  ClientDetail,
  VisitWithService,
  DbMembershipPlan,
  DbPayment,
} from '@/types'

export type { ClientListRow, ClientDetail, MembershipWithPlan, VisitWithService } from '@/types'

export async function getClients(): Promise<ClientListRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`*, memberships(*, membership_plans(*))`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as ClientListRow[]
}

export async function getClientById(id: string): Promise<ClientDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`*, memberships(*, membership_plans(*))`)
    .eq('id', id)
    .single()

  if (error) return null
  return data as unknown as ClientDetail
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

export async function getClientPayments(clientId: string): Promise<DbPayment[]> {
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

export async function getActivePlans(): Promise<DbMembershipPlan[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_usd')

  if (error) throw error
  return data ?? []
}
