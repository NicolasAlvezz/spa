import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { VERCEL_FUNCTION_REGION } from '@/lib/constants/infrastructure'

export const preferredRegion = VERCEL_FUNCTION_REGION

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: request } = await supabase
    .from('membership_requests')
    .select('id, client_id, status, expires_at')
    .eq('id', params.id)
    .single()

  if (!request) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Ownership check
  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('id', request.client_id)
    .eq('user_id', user.id)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Lazy expiry check
  if (new Date(request.expires_at) < new Date()) {
    await supabase
      .from('membership_requests')
      .update({ status: 'expired' })
      .eq('id', params.id)
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'not_pending', status: request.status }, { status: 409 })
  }

  const { error } = await supabase
    .from('membership_requests')
    .update({ status: 'declined' })
    .eq('id', params.id)

  if (error) {
    console.error('[POST /api/membership-requests/[id]/decline]', error)
    return NextResponse.json({ error: 'failed_to_decline' }, { status: 500 })
  }

  return NextResponse.json({ id: params.id })
}
