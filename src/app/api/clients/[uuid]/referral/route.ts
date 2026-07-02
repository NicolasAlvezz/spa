import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const REFERRAL_CREDIT_USD = 10

export async function POST(
  req: Request,
  { params }: { params: { uuid: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { uuid: clientId } = params
  if (!UUID_RE.test(clientId)) {
    return NextResponse.json({ error: 'invalid_uuid' }, { status: 400 })
  }

  const body: { referred_by_client_id: string | null } = await req.json()
  const { referred_by_client_id } = body

  if (referred_by_client_id !== null && !UUID_RE.test(referred_by_client_id)) {
    return NextResponse.json({ error: 'invalid_referrer_id' }, { status: 400 })
  }
  if (referred_by_client_id === clientId) {
    return NextResponse.json({ error: 'self_referral_not_allowed' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Only allowed before the first membership is assigned
  const { count } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'referral_only_for_first_membership' }, { status: 409 })
  }

  // Save referral on this client
  const { error: updateError } = await supabase
    .from('clients')
    .update({ referred_by_client_id })
    .eq('id', clientId)

  if (updateError) {
    console.error('[POST referral] update client:', updateError)
    return NextResponse.json({ error: 'failed_to_save_referral' }, { status: 500 })
  }

  // Award credit to the referrer (read-then-write; race condition acceptable for this use case)
  if (referred_by_client_id) {
    const { data: referrer } = await supabase
      .from('clients')
      .select('credit_balance')
      .eq('id', referred_by_client_id)
      .single()

    if (referrer) {
      const { error: creditError } = await supabase
        .from('clients')
        .update({ credit_balance: Number(referrer.credit_balance) + REFERRAL_CREDIT_USD })
        .eq('id', referred_by_client_id)

      if (creditError) {
        console.error('[POST referral] award credit:', creditError)
      }
    }
  }

  return NextResponse.json({ ok: true })
}
