import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  CONSENT_VERSION,
  getConsentSnapshot,
  type ConsentLanguage,
} from '@/lib/constants/consent'
import { VERCEL_FUNCTION_REGION } from '@/lib/constants/infrastructure'
import { parseClientIp } from '@/lib/utils/client-ip'

export const preferredRegion = VERCEL_FUNCTION_REGION
export const maxDuration = 30

const VALID_LANGUAGES: readonly ConsentLanguage[] = ['en', 'es'] as const

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // The client only sends *what* it's signing, never *what the text says*.
  // The snapshot of the legal text is taken server-side from messages/*.json,
  // so a tampered browser can never falsify the stored evidence.
  const body: { client_id?: string; language?: ConsentLanguage; signature_image?: string } =
    await req.json().catch(() => ({}))
  const { client_id, language, signature_image } = body

  if (!client_id || !language || !VALID_LANGUAGES.includes(language)) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify the target client actually belongs to the authenticated user.
  const { data: client } = await supabase
    .from('clients')
    .select('id, user_id')
    .eq('id', client_id)
    .single()

  if (!client || client.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const snapshot = getConsentSnapshot(language)

  const ip = parseClientIp(req)
  const userAgent = req.headers.get('user-agent') ?? null

  const { data, error } = await supabase
    .from('consent_acceptances')
    .insert({
      client_id,
      language,
      version: CONSENT_VERSION,
      medical_title:   snapshot.medical_title,
      medical_body:    snapshot.medical_body,
      agreement_title: snapshot.agreement_title,
      agreement_body:  snapshot.agreement_body,
      ip_address: ip,
      user_agent: userAgent,
      signature_image: signature_image ?? null,
    })
    .select('id, accepted_at')
    .single()

  if (error || !data) {
    console.error('[POST /api/consent-acceptances]', {
      client_id,
      code: error?.code,
      message: error?.message,
      details: error?.details,
    })
    return NextResponse.json(
      { error: 'failed_to_save', detail: error?.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ id: data.id, accepted_at: data.accepted_at })
}
