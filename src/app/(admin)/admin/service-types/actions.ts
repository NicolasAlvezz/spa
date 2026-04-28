'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function toggleServiceTypeAction(
  id: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user || user.app_metadata?.role !== 'admin') {
    return { error: 'unauthorized' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  const { error } = await supabase
    .from('service_types')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('[toggleServiceTypeAction] error:', error)
    return { error: error.message }
  }

  revalidatePath('/admin/service-types')
  return { error: null }
}
