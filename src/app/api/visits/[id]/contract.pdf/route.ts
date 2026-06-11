import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { renderConsentContract } from '@/components/pdf/ConsentContractDocument'
import type { ConsentLanguage } from '@/lib/constants/consent'
import enMessages from '../../../../../../messages/en.json'
import esMessages from '../../../../../../messages/es.json'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  // Admin-only
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Fetch visit + consent + client in one query
  const { data: visit, error } = await supabase
    .from('visits')
    .select(`
      id,
      visited_at,
      client_id,
      clients!inner(first_name, last_name, phone, address),
      consent_acceptance:consent_acceptances!consumed_by_visit(
        id, accepted_at, language, version,
        medical_title, medical_body, agreement_title, agreement_body,
        ip_address, user_agent
      )
    `)
    .eq('id', params.id)
    .single()

  if (error || !visit) {
    return NextResponse.json({ error: 'visit_not_found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visitAny = visit as any
  const consentArr = visitAny.consent_acceptance
  const consent = Array.isArray(consentArr) ? consentArr[0] : consentArr

  if (!consent) {
    return NextResponse.json(
      { error: 'no_consent_for_this_visit' },
      { status: 404 }
    )
  }

  const client = visitAny.clients
  const language = consent.language as ConsentLanguage
  const labels = (language === 'es' ? esMessages : enMessages).consent.pdf

  let buffer: Buffer
  try {
    buffer = await renderConsentContract({
      firstName: client.first_name,
      lastName: client.last_name,
      phone: client.phone,
      address: client.address,
      visitedAt: visit.visited_at,
      acceptedAt: consent.accepted_at,
      language,
      version: consent.version,
      medicalTitle: consent.medical_title,
      medicalBody: consent.medical_body,
      agreementTitle: consent.agreement_title,
      agreementBody: consent.agreement_body,
      ipAddress: consent.ip_address ?? null,
      userAgent: consent.user_agent ?? null,
      labels,
    })
  } catch (pdfError) {
    console.error('[contract.pdf] render error:', pdfError)
    return NextResponse.json({ error: 'pdf_render_failed' }, { status: 500 })
  }

  const visitDate = new Date(visit.visited_at).toISOString().slice(0, 10)
  const filename = `consent-${client.last_name}-${visitDate}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
