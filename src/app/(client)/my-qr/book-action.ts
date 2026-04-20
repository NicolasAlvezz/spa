'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/supabase/queries/clients'

/**
 * Books an appointment for the authenticated client.
 * Returns null on success, or an error key string on failure.
 */
export async function bookAppointmentAction(
  scheduledAt: string,
  notes: string | null
): Promise<string | null> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return 'error'

  const client = await getClientByUserId(user.id)
  if (!client) return 'error'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  const { error } = await supabase
    .from('appointments')
    .insert({
      client_id: client.id,
      scheduled_at: scheduledAt,
      notes: notes ?? null,
      status: 'scheduled',
    })

  if (error) {
    console.error('[bookAppointmentAction] error:', error)
    return 'error'
  }

  return null
}
