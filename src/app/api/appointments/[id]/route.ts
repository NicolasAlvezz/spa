import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['completed', 'cancelled', 'no_show'] as const
type StatusValue = typeof VALID_STATUSES[number]

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = params
  if (!id) {
    return NextResponse.json({ error: 'missing_id' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const status: StatusValue = body?.status

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id)

  if (error) {
    console.error('[PATCH /api/appointments/[id]] error:', error)
    return NextResponse.json({ error: 'failed_to_update' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
