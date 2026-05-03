import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { hasSchedulingConflict } from '@/lib/supabase/queries/appointments'
import { getCalendarAppointments } from '@/lib/supabase/queries/dashboard'

export async function GET(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
  }

  try {
    const appointments = await getCalendarAppointments(date)
    return NextResponse.json(appointments)
  } catch (err) {
    console.error('[GET /api/appointments] error:', err)
    return NextResponse.json({ error: 'failed_to_load' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    console.error('[appointments] unauthorized — user:', user?.id, 'authError:', authError?.message)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: {
    client_id: string
    service_type_id: string
    scheduled_at: string   // ISO 8601
    notes?: string | null
  } = await req.json()

  const { client_id, service_type_id, scheduled_at, notes } = body

  if (!client_id || !scheduled_at) {
    return NextResponse.json({ error: 'client_id and scheduled_at are required' }, { status: 400 })
  }

  if (!service_type_id) {
    return NextResponse.json({ error: 'service_type_id is required' }, { status: 400 })
  }

  const parsedStart = new Date(scheduled_at)
  if (Number.isNaN(parsedStart.getTime())) {
    return NextResponse.json({ error: 'invalid_scheduled_at' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  // Verify the service type exists and is active
  const { data: svcType, error: svcError } = await supabase
    .from('service_types')
    .select('id, duration_minutes')
    .eq('id', service_type_id)
    .eq('is_active', true)
    .single()

  if (svcError || !svcType) {
    return NextResponse.json({ error: 'invalid_service_type' }, { status: 400 })
  }

  const day = `${parsedStart.getFullYear()}-${String(parsedStart.getMonth() + 1).padStart(2, '0')}-${String(parsedStart.getDate()).padStart(2, '0')}`
  const hasConflict = await hasSchedulingConflict({
    date: day,
    startsAtISO: parsedStart.toISOString(),
    durationMinutes: Number(svcType.duration_minutes ?? 60),
  })

  if (hasConflict) {
    return NextResponse.json({ error: 'slot_occupied' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      client_id,
      service_type_id,
      scheduled_at,
      notes: notes ?? null,
      status: 'scheduled',
    })
    .select('id, scheduled_at')
    .single()

  if (error || !data) {
    console.error('[appointments] insert error:', error)
    return NextResponse.json({ error: 'failed_to_create_appointment' }, { status: 500 })
  }

  return NextResponse.json({ appointment_id: data.id, scheduled_at: data.scheduled_at })
}
