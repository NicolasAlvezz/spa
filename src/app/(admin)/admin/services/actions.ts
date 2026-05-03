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
  return {
    slug:           (formData.get('slug') as string).trim(),
    name_en:        (formData.get('name_en') as string).trim(),
    name_es:        (formData.get('name_es') as string).trim(),
    price_usd:      parseFloat(formData.get('price_usd') as string),
    duration_minutes: parseInt(formData.get('duration_minutes') as string, 10),
    description_en: (formData.get('description_en') as string | null)?.trim() || null,
    description_es: (formData.get('description_es') as string | null)?.trim() || null,
    is_active:      formData.get('is_active') === 'true',
  }
}

export async function createServiceAction(
  formData: FormData
): Promise<{ error: string | null }> {
  try {
    await requireAdmin()
  } catch {
    return { error: 'unauthorized' }
  }

  const fields = parseFormData(formData)

  if (!fields.slug || !fields.name_en || !fields.name_es || !fields.price_usd || !fields.duration_minutes) {
    return { error: 'missing_required_fields' }
  }

  const { error } = await supabaseAny()
    .from('service_types')
    .insert(fields)

  if (error) {
    if (error.code === '23505') return { error: 'slug_taken' }
    console.error('[createServiceAction]', error)
    return { error: error.message }
  }

  revalidatePath('/admin/services')
  return { error: null }
}

export async function updateServiceAction(
  id: string,
  formData: FormData
): Promise<{ error: string | null }> {
  try {
    await requireAdmin()
  } catch {
    return { error: 'unauthorized' }
  }

  const fields = parseFormData(formData)

  if (!fields.slug || !fields.name_en || !fields.name_es || !fields.price_usd || !fields.duration_minutes) {
    return { error: 'missing_required_fields' }
  }

  const { error } = await supabaseAny()
    .from('service_types')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: 'slug_taken' }
    console.error('[updateServiceAction]', error)
    return { error: error.message }
  }

  revalidatePath('/admin/services')
  return { error: null }
}

export async function deleteServiceAction(
  id: string
): Promise<{ error: string | null; deactivated?: boolean }> {
  try {
    await requireAdmin()
  } catch {
    return { error: 'unauthorized' }
  }

  const supabase = supabaseAny()

  // Check FK references in visits and appointments
  const [visitsRes, apptsRes] = await Promise.all([
    supabase.from('visits').select('id', { count: 'exact', head: true }).eq('service_type_id', id),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('service_type_id', id),
  ])

  const hasRefs = (visitsRes.count ?? 0) > 0 || (apptsRes.count ?? 0) > 0

  if (hasRefs) {
    // Has references — deactivate instead of deleting
    const { error } = await supabase
      .from('service_types')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      console.error('[deleteServiceAction] deactivate:', error)
      return { error: error.message }
    }
    revalidatePath('/admin/services')
    return { error: null, deactivated: true }
  }

  // No references — hard delete
  const { error } = await supabase.from('service_types').delete().eq('id', id)
  if (error) {
    console.error('[deleteServiceAction] delete:', error)
    return { error: error.message }
  }

  revalidatePath('/admin/services')
  return { error: null, deactivated: false }
}

export async function toggleServiceAction(
  id: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  try {
    await requireAdmin()
  } catch {
    return { error: 'unauthorized' }
  }

  const { error } = await supabaseAny()
    .from('service_types')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[toggleServiceAction]', error)
    return { error: error.message }
  }

  revalidatePath('/admin/services')
  return { error: null }
}
