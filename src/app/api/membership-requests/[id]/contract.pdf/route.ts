import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { renderMembershipContract } from '@/components/pdf/MembershipContractDocument'
import type { ContractLanguage } from '@/lib/constants/membership-contract'
import enMessages from '../../../../../../messages/en.json'
import esMessages from '../../../../../../messages/es.json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any
  const { data: request, error } = await supabaseAny
    .from('membership_requests')
    .select(`
      id,
      language,
      version,
      terms_title,
      terms_body,
      signed_at,
      signed_ip,
      signed_user_agent,
      signature_image,
      clients!inner(first_name, last_name, phone, address),
      membership_plans!inner(name_en, name_es, price_usd)
    `)
    .eq('id', params.id)
    .single()

  if (error || !request) {
    return NextResponse.json({ error: 'request_not_found' }, { status: 404 })
  }

  if (!request.signed_at) {
    return NextResponse.json({ error: 'not_yet_signed' }, { status: 422 })
  }

  const language = request.language as ContractLanguage
  const labels = (language === 'es' ? esMessages : enMessages).membership_contract.pdf
  const client = request.clients
  const plan = request.membership_plans
  const planName = language === 'es' ? plan.name_es : plan.name_en

  let buffer: Buffer
  try {
    buffer = await renderMembershipContract({
      firstName:       client.first_name,
      lastName:        client.last_name,
      phone:           client.phone,
      address:         client.address,
      planName,
      priceUsd:        plan.price_usd,
      signedAt:        request.signed_at,
      language,
      version:         request.version,
      termsTitle:      request.terms_title,
      termsBody:       request.terms_body,
      signedIp:        request.signed_ip ?? null,
      signedUserAgent: request.signed_user_agent ?? null,
      signatureImage:  request.signature_image ?? null,
      labels,
    })
  } catch (pdfError) {
    console.error('[membership contract.pdf] render error:', pdfError)
    return NextResponse.json({ error: 'pdf_render_failed' }, { status: 500 })
  }

  const signedDate = new Date(request.signed_at).toISOString().slice(0, 10)
  const filename = `membership-contract-${client.last_name}-${signedDate}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
