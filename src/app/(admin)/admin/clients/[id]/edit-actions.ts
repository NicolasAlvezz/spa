'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const authClient = await createClient()
  const { data: { user }, error } = await authClient.auth.getUser()
  if (error || !user || user.app_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function updateClientInfo(
  clientId: string,
  data: { first_name: string; last_name: string; phone: string }
): Promise<void> {
  await requireAdmin()

  const first_name = data.first_name.trim()
  const last_name = data.last_name.trim()
  const phone = data.phone.trim()

  if (!first_name || !last_name || !phone) {
    throw new Error('Missing required fields')
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('clients')
    .update({ first_name, last_name, phone })
    .eq('id', clientId)

  if (error) throw new Error('Failed to update client')

  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/clients')
}
