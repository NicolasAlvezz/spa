'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/supabase/queries/clients'
import { hasSchedulingConflict } from '@/lib/supabase/queries/appointments'

/**
 * Books an appointment for the authenticated client.
 * Returns null on success, or an error key string on failure.
 */
export async function bookAppointmentAction(
  scheduledAt: string,
  massageTypeId: string,
  notes: string | null
): Promise<string | null> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return 'error'

  const client = await getClientByUserId(user.id)
  if (!client) return 'error'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  // Verify the massage type exists and is active
  const { data: svcType, error: svcError } = await supabase
    .from('service_types')
    .select('id, duration_minutes')
    .eq('id', massageTypeId)
    .eq('is_active', true)
    .single()

  if (svcError || !svcType) {
    console.error('[bookAppointmentAction] invalid massage type:', massageTypeId, svcError?.message)
    return 'error'
  }

  const parsedStart = new Date(scheduledAt)
  if (Number.isNaN(parsedStart.getTime())) return 'error'

  const day = `${parsedStart.getFullYear()}-${String(parsedStart.getMonth() + 1).padStart(2, '0')}-${String(parsedStart.getDate()).padStart(2, '0')}`
  const hasConflict = await hasSchedulingConflict({
    date: day,
    startsAtISO: parsedStart.toISOString(),
    durationMinutes: Number(svcType.duration_minutes ?? 60),
  })

  if (hasConflict) return 'slot_occupied'

  const { error } = await supabase
    .from('appointments')
    .insert({
      client_id:       client.id,
      service_type_id: massageTypeId,
      scheduled_at:    scheduledAt,
      notes:           notes ?? null,
      status:          'scheduled',
    })

  if (error) {
    console.error('[bookAppointmentAction] error:', error)
    return 'error'
  }

  return null
}
