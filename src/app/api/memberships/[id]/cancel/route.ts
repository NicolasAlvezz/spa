import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: {
    notes?: string
    cancellation_fee_usd?: number
  } = await req.json().catch(() => ({}))

  const { notes, cancellation_fee_usd } = body
  const hasFee = typeof cancellation_fee_usd === 'number' && cancellation_fee_usd > 0

  const supabase = createServiceClient()

  const { data: membership, error: fetchError } = await supabase
    .from('memberships')
    .select('id, client_id, status')
    .eq('id', params.id)
    .single()

  if (fetchError || !membership) {
    return NextResponse.json({ error: 'membership_not_found' }, { status: 404 })
  }

  if (membership.status !== 'active') {
    return NextResponse.json({ error: 'membership_not_active' }, { status: 409 })
  }

  const { error: cancelError } = await supabase
    .from('memberships')
    .update({ status: 'cancelled' })
    .eq('id', params.id)

  if (cancelError) {
    console.error('[memberships/cancel] update error:', cancelError)
    return NextResponse.json({ error: 'cancel_failed' }, { status: 500 })
  }

  if (hasFee) {
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        client_id: membership.client_id,
        membership_id: params.id,
        amount_usd: cancellation_fee_usd,
        method: null,
        concept: 'cancellation_fee',
        notes: notes ?? null,
      })

    if (paymentError) {
      console.error('[memberships/cancel] payment insert error:', paymentError)
      return NextResponse.json({ error: 'payment_failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
