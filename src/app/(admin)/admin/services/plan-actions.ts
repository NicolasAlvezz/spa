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

function parseFormData(formData: FormData) {
  const extrasEnRaw = (formData.get('extras_en') as string | null)?.trim() ?? ''
  const extrasEsRaw = (formData.get('extras_es') as string | null)?.trim() ?? ''
  return {
    slug:               (formData.get('slug') as string).trim(),
    name_en:            (formData.get('name_en') as string).trim(),
    name_es:            (formData.get('name_es') as string).trim(),
    price_usd:          parseFloat(formData.get('price_usd') as string),
    sessions_per_month: parseInt(formData.get('sessions_per_month') as string, 10),
    rollover_max:       parseInt(formData.get('rollover_max') as string, 10),
    min_months:         parseInt(formData.get('min_months') as string, 10),
    extras_en:          extrasEnRaw ? extrasEnRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
    extras_es:          extrasEsRaw ? extrasEsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
    requires_healthcare: formData.get('requires_healthcare') === 'true',
    is_active:          formData.get('is_active') === 'true',
  }
}

export async function createPlanAction(
  formData: FormData
): Promise<{ error: string | null }> {
  try { await requireAdmin() } catch { return { error: 'unauthorized' } }

  const fields = parseFormData(formData)
  if (!fields.slug || !fields.name_en || !fields.name_es || isNaN(fields.price_usd)) {
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
  if (!fields.slug || !fields.name_en || !fields.name_es || isNaN(fields.price_usd)) {
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
