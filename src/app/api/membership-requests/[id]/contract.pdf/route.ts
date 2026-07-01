import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { renderMembershipContract } from '@/components/pdf/MembershipContractDocument'
import { renderBasicMembershipContract } from '@/components/pdf/BasicMembershipContract'
import { getBasicContractTemplate } from '@/lib/constants/membership-contract-templates'
import { BASIC_CONTRACT_VERSION } from '@/lib/constants/membership-contract'
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

  // Allow both admin and the owning client to download
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const isAdmin = user.app_metadata?.role === 'admin'

  const supabase = createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any
  const { data: request, error } = await supabaseAny
    .from('membership_requests')
    .select(`
      id, language, version, terms_title, terms_body,
      signed_at, signed_ip, signed_user_agent,
      signature_image, admin_signature_image,
      contract_fields, payment_method, card_last4,
      clients!inner(id, first_name, last_name, phone, address, user_id),
      membership_plans!inner(name_en, name_es, price_usd)
    `)
    .eq('id', params.id)
    .single()

  if (error || !request) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!request.signed_at) return NextResponse.json({ error: 'not_yet_signed' }, { status: 422 })

  // Auth check: admin can always download; client can only download their own
  if (!isAdmin && request.clients.user_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const language = request.language as ContractLanguage
  const client = request.clients
  const plan = request.membership_plans
  const signedDate = new Date(request.signed_at).toISOString().slice(0, 10)
  const lastName = client.last_name

  let buffer: Buffer

  if (request.version === BASIC_CONTRACT_VERSION && request.contract_fields) {
    // ── New 6-page basic contract renderer ──
    const template = getBasicContractTemplate(language)
    const fields = request.contract_fields as Record<string, string>
    try {
      buffer = await renderBasicMembershipContract({
        template,
        language,
        full_name:    fields.full_name    ?? `${client.first_name} ${client.last_name}`,
        date_of_birth: fields.date_of_birth ?? '',
        phone:        fields.phone        ?? client.phone,
        email:        fields.email        ?? '',
        address:      fields.address      ?? client.address,
        city_state:   fields.city_state   ?? '',
        start_date:   fields.start_date   ?? '',
        payment_method: (request.payment_method as 'credit' | 'debit') ?? 'credit',
        card_last4:   request.card_last4  ?? '????',
        client_signature_image: request.signature_image ?? '',
        admin_signature_image:  request.admin_signature_image ?? null,
        signed_at:    request.signed_at,
        signed_ip:    request.signed_ip   ?? null,
        signed_user_agent: request.signed_user_agent ?? null,
      })
    } catch (err) {
      console.error('[contract.pdf basic] render error:', err)
      return NextResponse.json({ error: 'pdf_render_failed' }, { status: 500 })
    }
  } else {
    // ── Legacy renderer (membership-v1.0) ──
    const labels = (language === 'es' ? esMessages : enMessages).membership_contract.pdf
    const planName = language === 'es' ? plan.name_es : plan.name_en
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
    } catch (err) {
      console.error('[contract.pdf legacy] render error:', err)
      return NextResponse.json({ error: 'pdf_render_failed' }, { status: 500 })
    }
  }

  const filename = `membership-contract-${lastName}-${signedDate}.pdf`
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
