'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const authClient = await createClient()
  const { data: { user }, error } = await authClient.auth.getUser()
  if (error || !user || user.app_metadata?.role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function deactivateClient(clientId: string): Promise<void> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single()

  const { error } = await supabase
    .from('clients')
    .update({ is_active: false })
    .eq('id', clientId)

  if (error) throw new Error('Failed to deactivate client')

  if (client?.user_id) {
    await supabase.auth.admin.updateUserById(client.user_id, {
      ban_duration: '87600h', // 10 years — effectively disabled
    })
  }

  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/clients')
}

export async function reactivateClient(clientId: string): Promise<void> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single()

  const { error } = await supabase
    .from('clients')
    .update({ is_active: true })
    .eq('id', clientId)

  if (error) throw new Error('Failed to reactivate client')

  if (client?.user_id) {
    await supabase.auth.admin.updateUserById(client.user_id, {
      ban_duration: 'none',
    })
  }

  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin/clients')
}

export async function deleteClientPermanently(clientId: string): Promise<void> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  // Delete dependent records in FK order
  await db.from('visits').delete().eq('client_id', clientId)
  await db.from('payments').delete().eq('client_id', clientId)
  await db.from('appointments').delete().eq('client_id', clientId) // not yet in database.ts types
  await db.from('memberships').delete().eq('client_id', clientId)
  await db.from('client_health_forms').delete().eq('client_id', clientId)

  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  if (error) throw new Error('Failed to delete client')

  if (client?.user_id) {
    await supabase.auth.admin.deleteUser(client.user_id)
  }

  redirect('/admin/clients')
}
