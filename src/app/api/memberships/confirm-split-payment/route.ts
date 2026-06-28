import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: { membership_id: string } = await req.json()
  const { membership_id } = body

  if (!membership_id) {
    return NextResponse.json({ error: 'membership_id is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Atomic confirm via Postgres function: locks the membership row, validates
  // status/plan_type/pending, updates split_payment_pending, and inserts the
  // payment in one transaction. Two concurrent calls cannot both succeed —
  // the second sees pending=false after the first commits and aborts cleanly,
  // so the customer can never be double-charged.
  const { data: rpcRows, error: rpcError } = await supabase.rpc(
    'confirm_split_payment_atomic',
    { p_membership_id: membership_id, p_payment_method: null },
  )

  if (rpcError) {
    switch (rpcError.code) {
      case 'P0001':
        return NextResponse.json({ error: 'membership_not_found' }, { status: 404 })
      case 'P0002':
        return NextResponse.json({ error: 'not_a_pack' }, { status: 400 })
      case 'P0003':
        return NextResponse.json({ error: 'membership_not_active' }, { status: 400 })
      case 'P0004':
        return NextResponse.json({ error: 'no_split_payment_pending' }, { status: 400 })
      default:
        console.error('[confirm-split-payment] rpc error:', rpcError)
        return NextResponse.json({ error: 'failed_to_confirm_payment' }, { status: 500 })
    }
  }

  const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows
  if (!row) {
    return NextResponse.json({ error: 'failed_to_confirm_payment' }, { status: 500 })
  }

  return NextResponse.json({ success: true, amount_paid: row.amount_paid })
}
