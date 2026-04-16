import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    console.error('[appointments] unauthorized — user:', user?.id, 'authError:', authError?.message)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: {
    client_id: string
    service_type_id?: string | null
    scheduled_at: string   // ISO 8601
    notes?: string | null
  } = await req.json()

  const { client_id, service_type_id, scheduled_at, notes } = body

  if (!client_id || !scheduled_at) {
    return NextResponse.json({ error: 'client_id and scheduled_at are required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      client_id,
      service_type_id: service_type_id ?? null,
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
