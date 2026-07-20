import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  BASIC_CONTRACT_VERSION,
  MEMBERSHIP_REQUEST_TTL_MS,
  getPlanContractSnapshot,
  type ContractLanguage,
} from '@/lib/constants/membership-contract'
import { VERCEL_FUNCTION_REGION } from '@/lib/constants/infrastructure'

export const preferredRegion = VERCEL_FUNCTION_REGION

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_LANGUAGES: ContractLanguage[] = ['en', 'es']

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body: {
    client_id?: string
    plan_id?: string
    language?: string
    admin_signature_image?: string | null
    use_credit?: boolean
  } = await req.json()
  const { client_id, plan_id, language, admin_signature_image, use_credit } = body

  if (
    !client_id || !UUID_RE.test(client_id) ||
    !plan_id   || !UUID_RE.test(plan_id) ||
    !language  || !VALID_LANGUAGES.includes(language as ContractLanguage)
  ) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  if (!admin_signature_image || typeof admin_signature_image !== 'string') {
    return NextResponse.json({ error: 'admin_signature_required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch plan to use its specific contract text
  const { data: plan } = await supabase
    .from('membership_plans')
    .select('contract_title_en, contract_title_es, contract_body_en, contract_body_es')
    .eq('id', plan_id)
    .single()

  if (!plan) {
    return NextResponse.json({ error: 'plan_not_found' }, { status: 404 })
  }

  // Conflict check: no active pending request for this client
  const { data: existing } = await supabase
    .from('membership_requests')
    .select('id')
    .eq('client_id', client_id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'conflict_pending', existing_request_id: existing.id },
      { status: 409 }
    )
  }

  const snapshot = getPlanContractSnapshot(plan, language as ContractLanguage)
  const expiresAt = new Date(Date.now() + MEMBERSHIP_REQUEST_TTL_MS).toISOString()

  const { data, error } = await supabase
    .from('membership_requests')
    .insert({
      client_id,
      plan_id,
      requested_by:         user.email ?? user.id,
      language:             language as ContractLanguage,
      version:              BASIC_CONTRACT_VERSION,
      terms_title:          snapshot.terms_title,
      terms_body:           snapshot.terms_body,
      expires_at:           expiresAt,
      admin_signature_image,
      admin_signed_at:      new Date().toISOString(),
      use_credit:           use_credit === true,
    })
    .select('id, client_id, plan_id, status, expires_at, created_at')
    .single()

  if (error || !data) {
    console.error('[POST /api/membership-requests]', error)
    return NextResponse.json({ error: 'failed_to_create' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
