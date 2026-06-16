import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: request } = await supabase
    .from('membership_requests')
    .select('id, status')
    .eq('id', params.id)
    .single()

  if (!request) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'not_pending' }, { status: 409 })
  }

  const { error } = await supabase
    .from('membership_requests')
    .update({ status: 'cancelled' })
    .eq('id', params.id)

  if (error) {
    console.error('[DELETE /api/membership-requests/[id]]', error)
    return NextResponse.json({ error: 'failed_to_cancel' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
