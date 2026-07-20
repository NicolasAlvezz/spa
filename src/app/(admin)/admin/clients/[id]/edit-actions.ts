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

// Manually add or remove credit for a client. Positive deltaUsd adds, negative
// subtracts. The balance is clamped at 0 so it can never go negative. Returns the
// resulting balance so the caller can reflect it immediately.
export async function adjustClientCredit(
  clientId: string,
  deltaUsd: number,
): Promise<{ credit_balance: number }> {
  await requireAdmin()

  if (typeof deltaUsd !== 'number' || !Number.isFinite(deltaUsd) || deltaUsd === 0) {
    throw new Error('Invalid amount')
  }

  const supabase = createServiceClient()

  const { data: clientRow, error: readError } = await supabase
    .from('clients')
    .select('credit_balance')
    .eq('id', clientId)
    .single()

  if (readError || !clientRow) throw new Error('Client not found')

  const current = Number(clientRow.credit_balance ?? 0)
  const next = Math.max(0, Math.round((current + deltaUsd) * 100) / 100)

  const { error } = await supabase
    .from('clients')
    .update({ credit_balance: next })
    .eq('id', clientId)

  if (error) throw new Error('Failed to update credit')

  revalidatePath(`/admin/clients/${clientId}`)
  return { credit_balance: next }
}
