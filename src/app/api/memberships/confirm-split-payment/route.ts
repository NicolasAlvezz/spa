import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { PaymentMethod } from '@/types'

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: { membership_id: string; payment_method: PaymentMethod } = await req.json()
  const { membership_id, payment_method } = body

  if (!membership_id || !payment_method) {
    return NextResponse.json({ error: 'membership_id and payment_method are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: membership, error: fetchError } = await supabase
    .from('memberships')
    .select('id, client_id, split_payment_pending, membership_plans(split_first_amount, price_usd, plan_type)')
    .eq('id', membership_id)
    .single()

  if (fetchError || !membership) {
    return NextResponse.json({ error: 'membership_not_found' }, { status: 404 })
  }

  const plan = membership.membership_plans as unknown as {
    split_first_amount: number | null
    price_usd: number
    plan_type: string
  } | null

  if (plan?.plan_type !== 'pack') {
    return NextResponse.json({ error: 'not_a_pack' }, { status: 400 })
  }

  if (!membership.split_payment_pending) {
    return NextResponse.json({ error: 'no_split_payment_pending' }, { status: 400 })
  }

  const firstAmount = plan.split_first_amount ?? 0
  const secondAmount = plan.price_usd - firstAmount

  const [{ error: updateError }, { error: paymentError }] = await Promise.all([
    supabase
      .from('memberships')
      .update({ split_payment_pending: false })
      .eq('id', membership_id),
    supabase
      .from('payments')
      .insert({
        client_id: membership.client_id,
        membership_id,
        amount_usd: secondAmount,
        method: payment_method,
        concept: 'pack_split_second',
      }),
  ])

  if (updateError || paymentError) {
    console.error('[confirm-split-payment] error:', updateError, paymentError)
    return NextResponse.json({ error: 'failed_to_confirm_payment' }, { status: 500 })
  }

  return NextResponse.json({ success: true, amount_paid: secondAmount })
}
