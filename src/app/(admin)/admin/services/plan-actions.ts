'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function requireAdmin() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error('unauthorized')
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = () => createServiceClient() as any

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function parseFormData(formData: FormData) {
  const extrasEnRaw = (formData.get('extras_en') as string | null)?.trim() ?? ''
  const extrasEsRaw = (formData.get('extras_es') as string | null)?.trim() ?? ''
  const nameEn     = (formData.get('name_en') as string).trim()
  const planType   = ((formData.get('plan_type') as string | null) ?? 'monthly').trim() as 'monthly' | 'pack'
  const isPack     = planType === 'pack'

  return {
    slug:               toSlug(nameEn),
    name_en:            nameEn,
    name_es:            (formData.get('name_es') as string).trim(),
    price_usd:            parseFloat(formData.get('price_usd') as string),
    additional_price_usd: (() => {
      const v = (formData.get('additional_price_usd') as string | null)?.trim()
      if (!v || isNaN(parseFloat(v))) return null
      return parseFloat(v)
    })(),
    plan_type:          planType,
    // Monthly-only (zero-filled for packs so NOT NULL columns are satisfied)
    sessions_per_month: isPack ? 0 : parseInt(formData.get('sessions_per_month') as string, 10),
    rollover_max:       isPack ? 0 : parseInt(formData.get('rollover_max') as string, 10),
    min_months:         isPack ? 0 : parseInt(formData.get('min_months') as string, 10),
    // Pack-only
    total_sessions:     isPack ? parseInt(formData.get('total_sessions') as string, 10) : null,
    allows_split_payment: isPack ? formData.get('allows_split_payment') === 'true' : false,
    // Shared
    extras_en:          extrasEnRaw ? extrasEnRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
    extras_es:          extrasEsRaw ? extrasEsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
    is_active:          formData.get('is_active') === 'true',
  }
}

export async function createPlanAction(
  formData: FormData
): Promise<{ error: string | null }> {
  try { await requireAdmin() } catch { return { error: 'unauthorized' } }

  const fields = parseFormData(formData)
  if (!fields.name_en || !fields.name_es || isNaN(fields.price_usd)) {
    return { error: 'missing_required_fields' }
  }

  const { error } = await supabaseAny().from('membership_plans').insert(fields)
  if (error) {
    if (error.code === '23505') return { error: 'slug_taken' }
    console.error('[createPlanAction]', error)
    return { error: error.message }
  }

  revalidatePath('/admin/services')
  return { error: null }
}

export async function updatePlanAction(
  id: string,
  formData: FormData
): Promise<{ error: string | null }> {
  try { await requireAdmin() } catch { return { error: 'unauthorized' } }

  const fields = parseFormData(formData)
  if (!fields.name_en || !fields.name_es || isNaN(fields.price_usd)) {
    return { error: 'missing_required_fields' }
  }

  const { error } = await supabaseAny()
    .from('membership_plans')
    .update(fields)
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: 'slug_taken' }
    console.error('[updatePlanAction]', error)
    return { error: error.message }
  }

  revalidatePath('/admin/services')
  return { error: null }
}

export async function deletePlanAction(
  id: string
): Promise<{ error: string | null; deactivated?: boolean }> {
  try { await requireAdmin() } catch { return { error: 'unauthorized' } }

  const supabase = supabaseAny()
  const { count } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', id)

  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('membership_plans')
      .update({ is_active: false })
      .eq('id', id)
    if (error) { console.error('[deletePlanAction] deactivate:', error); return { error: error.message } }
    revalidatePath('/admin/services')
    return { error: null, deactivated: true }
  }

  const { error } = await supabase.from('membership_plans').delete().eq('id', id)
  if (error) { console.error('[deletePlanAction] delete:', error); return { error: error.message } }
  revalidatePath('/admin/services')
  return { error: null, deactivated: false }
}

export async function togglePlanAction(
  id: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  try { await requireAdmin() } catch { return { error: 'unauthorized' } }

  const { error } = await supabaseAny()
    .from('membership_plans')
    .update({ is_active: isActive })
    .eq('id', id)

  if (error) { console.error('[togglePlanAction]', error); return { error: error.message } }
  revalidatePath('/admin/services')
  return { error: null }
}
