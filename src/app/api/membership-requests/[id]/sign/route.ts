import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BASIC_CONTRACT_VERSION } from '@/lib/constants/membership-contract'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch the request and verify it belongs to this user's client
  const { data: request } = await supabase
    .from('membership_requests')
    .select('id, client_id, status, expires_at, version')
    .eq('id', params.id)
    .single()

  if (!request) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Ownership check: the request's client must belong to the authenticated user
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

  const body: {
    signature_image?: string
    contract_fields?: {
      full_name: string
      date_of_birth: string
      phone: string
      email: string
      address: string
      city_state: string
      start_date: string
    }
    payment_method?: 'credit' | 'debit'
    card_last4?: string
  } = await req.json().catch(() => ({}))

  const { signature_image, contract_fields, payment_method, card_last4 } = body

  // Validate required fields for basic-v1.0 contracts
  if (request.version === BASIC_CONTRACT_VERSION) {
    if (
      !contract_fields?.full_name  ||
      !contract_fields?.email      ||
      !contract_fields?.address    ||
      !contract_fields?.city_state ||
      !contract_fields?.start_date
    ) {
      return NextResponse.json({ error: 'missing_contract_fields' }, { status: 400 })
    }
    if (!payment_method || !['credit', 'debit'].includes(payment_method)) {
      return NextResponse.json({ error: 'invalid_payment_method' }, { status: 400 })
    }
    if (!card_last4 || !/^\d{4}$/.test(card_last4)) {
      return NextResponse.json({ error: 'invalid_card_last4' }, { status: 400 })
    }
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  const userAgent = req.headers.get('user-agent') ?? null
  const signedAt = new Date().toISOString()

  const { error } = await supabase
    .from('membership_requests')
    .update({
      status:            'signed',
      signed_at:         signedAt,
      signed_ip:         ip,
      signed_user_agent: userAgent,
      signature_image:   signature_image ?? null,
      ...(request.version === BASIC_CONTRACT_VERSION ? {
        contract_fields:  contract_fields as Record<string, string>,
        payment_method:   payment_method,
        card_last4:       card_last4,
      } : {}),
    })
    .eq('id', params.id)

  if (error) {
    console.error('[POST /api/membership-requests/[id]/sign]', error)
    return NextResponse.json({ error: 'failed_to_sign' }, { status: 500 })
  }

  return NextResponse.json({ id: params.id, signed_at: signedAt })
}
