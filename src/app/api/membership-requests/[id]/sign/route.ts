import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { BASIC_CONTRACT_VERSION } from '@/lib/constants/membership-contract'
import { VERCEL_FUNCTION_REGION } from '@/lib/constants/infrastructure'
import { assignMembershipAfterSign } from '@/lib/memberships/assign-after-sign'

export const preferredRegion = VERCEL_FUNCTION_REGION

/**
 * Extracts a valid IP address from proxy headers. Returns null if the header is
 * missing, empty, or malformed — storing an invalid value into the `inet` column
 * would make the whole signing UPDATE fail with a 500 (intermittent on mobile
 * networks where x-forwarded-for is sometimes empty or malformed).
 */
function parseClientIp(req: Request): string | null {
  const candidate =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    ''

  if (!candidate) return null

  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6 = /^[0-9a-fA-F:]+$/
  if (ipv4.test(candidate) || (candidate.includes(':') && ipv6.test(candidate))) {
    return candidate
  }
  return null
}

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
    .select('id, client_id, plan_id, status, expires_at, version, signed_at')
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

  // Idempotency: if it's already signed, treat a repeat submit as success.
  // This prevents a double-tap (or a retry after a lost/slow response) from
  // showing an error even though the contract was actually signed.
  if (request.status === 'signed') {
    return NextResponse.json({ id: params.id, signed_at: request.signed_at, already_signed: true })
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

  const ip = parseClientIp(req)
  const userAgent = req.headers.get('user-agent') ?? null
  const signedAt = new Date().toISOString()

  const { data: updated, error } = await supabase
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
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[POST /api/membership-requests/[id]/sign]', {
      request_id: params.id,
      code: error.code,
      message: error.message,
      details: error.details,
    })
    return NextResponse.json(
      { error: 'failed_to_sign', detail: error.message },
      { status: 500 }
    )
  }

  // Auto-create the membership in the background so the HTTP response returns
  // as soon as the signature is saved. US mobile clients on cellular data often
  // drop connections when the server holds the response open too long.
  if (updated && request.plan_id) {
    waitUntil(
      assignMembershipAfterSign({
        requestId: request.id,
        clientId: request.client_id,
        planId: request.plan_id,
      }).catch(err => {
        console.error('[sign] auto-assign failed:', err)
      })
    )
  }

  return NextResponse.json({ id: params.id, signed_at: signedAt })
}
