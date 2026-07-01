// src/components/pdf/BasicMembershipContract.tsx
import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import { BUSINESS } from '@/lib/constants/business'
import type { BasicContractTemplate } from '@/lib/constants/membership-contract-templates'

export interface BasicContractPdfProps {
  template: BasicContractTemplate
  language: 'en' | 'es'
  // Client fields (filled by client at signing)
  full_name: string
  date_of_birth: string
  phone: string
  email: string
  address: string
  city_state: string
  start_date: string
  // Payment info (filled by client at signing)
  payment_method: 'credit' | 'debit'
  card_last4: string
  // Signatures
  client_signature_image: string       // base64 PNG — used for Firma del Titular + Firma del Cliente
  admin_signature_image: string | null  // base64 PNG — Representante
  // Dates (= client signed_at)
  signed_at: string  // ISO timestamp
  // Metadata
  signed_ip: string | null
  signed_user_agent: string | null
}

const BRAND = '#6b5344'
const DARK  = '#1a1a1a'
const GRAY  = '#6b7280'
const LIGHT = '#f9fafb'
const BORDER = '#e5e7eb'

const s = StyleSheet.create({
  // Shared page
  page: { fontFamily: 'Helvetica', fontSize: 9.5, color: DARK, paddingHorizontal: 50, paddingVertical: 48 },

  // Page 1 – Title
  p1Bg:    { flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  p1Title: { fontSize: 36, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center', letterSpacing: 2 },
  p1Sub:   { fontSize: 13, color: '#c9b99a', marginTop: 12, textAlign: 'center', letterSpacing: 1 },

  // Page 2 – Marketing
  p2Brand:     { fontSize: 18, fontFamily: 'Helvetica-Bold', color: BRAND, marginBottom: 4 },
  p2HeadBig:   { fontSize: 14, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 8 },
  p2Body:      { fontSize: 9.5, color: DARK, lineHeight: 1.6, marginBottom: 12 },
  p2Cost:      { fontSize: 11, fontFamily: 'Helvetica-Bold', color: BRAND, marginBottom: 2 },
  p2CostVal:   { fontSize: 22, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 12 },
  p2IntroHead: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 4 },

  // Shared section
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: DARK, marginBottom: 10, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: BORDER },
  row:          { flexDirection: 'row', marginBottom: 6 },
  label:        { width: 140, color: GRAY, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  value:        { flex: 1, color: DARK },
  underline:    { flex: 1, borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 2, color: DARK },

  // Page 4 – Benefits
  benefitText: { fontSize: 9, color: DARK, lineHeight: 1.65 },

  // Page 5 – Terms
  termsText: { fontSize: 9, color: DARK, lineHeight: 1.7 },

  // Page 6 – Payment + Sigs
  payMethodRow:   { flexDirection: 'row', gap: 16, marginBottom: 8 },
  payOption:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox:       { width: 10, height: 10, borderWidth: 1, borderColor: DARK },
  checkboxFilled: { width: 10, height: 10, borderWidth: 1, borderColor: DARK, backgroundColor: DARK },
  sigArea:        { marginTop: 4, height: 60, borderBottomWidth: 1, borderBottomColor: BORDER },
  sigImg:         { height: 60, objectFit: 'contain', alignSelf: 'flex-start' },

  // Shared
  divider:     { borderTopWidth: 1, borderTopColor: BORDER, marginVertical: 12 },
  footer:      { marginTop: 8, padding: 8, backgroundColor: LIGHT, borderRadius: 4 },
  footerText:  { fontSize: 7.5, color: GRAY, lineHeight: 1.5 },
  mb4:  { marginBottom: 4 },
  mb8:  { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb20: { marginBottom: 20 },
})

function formatSignedDate(iso: string, language: 'en' | 'es'): string {
  try {
    return new Date(iso).toLocaleDateString(language === 'es' ? 'es-US' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      timeZone: BUSINESS.timezone,
    })
  } catch { return iso }
}

// ── Page 1: Title ─────────────────────────────────────────────────────────────
function TitlePage({ t }: { t: BasicContractTemplate }) {
  return (
    <Page size="LETTER" style={{ padding: 0 }}>
      <View style={s.p1Bg}>
        <Text style={s.p1Title}>{t.slide1_title}</Text>
        <Text style={s.p1Sub}>{BUSINESS.legalName}</Text>
      </View>
    </Page>
  )
}

// ── Page 2: Marketing ─────────────────────────────────────────────────────────
function MarketingPage({ t }: { t: BasicContractTemplate }) {
  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.p2Brand}>{t.slide2_wellness_title}</Text>
      <Text style={s.p2HeadBig}>{t.slide2_invest_subtitle}</Text>
      <Text style={s.p2Body}>{t.slide2_description}</Text>
      <Text style={s.p2Cost}>{t.slide2_cost_label}</Text>
      <Text style={s.p2CostVal}>{t.slide2_cost_value}</Text>
      <Text style={s.p2IntroHead}>{t.slide2_intro_heading}</Text>
      <Text style={s.p2Body}>{t.slide2_intro_body}</Text>
    </Page>
  )
}

// ── Page 3: Client Info ───────────────────────────────────────────────────────
function ClientInfoPage({ t, p }: { t: BasicContractTemplate; p: BasicContractPdfProps }) {
  const fields: [string, string][] = [
    [t.slide3_label_full_name,  p.full_name],
    [t.slide3_label_dob,        p.date_of_birth],
    [t.slide3_label_phone,      p.phone],
    [t.slide3_label_email,      p.email],
    [t.slide3_label_address,    p.address],
    [t.slide3_label_city_state, p.city_state],
  ]

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={[s.sectionTitle, { fontSize: 14 }]}>{t.slide3_contract_title}</Text>
      <Text style={[s.mb8, { fontSize: 12, fontFamily: 'Helvetica-Bold' }]}>{t.slide3_company}</Text>
      <Text style={[s.p2Body, s.mb20]}>{t.slide3_preamble}</Text>

      <Text style={s.sectionTitle}>{t.slide3_client_info_title}</Text>

      {fields.map(([label, value]) => (
        <View key={label} style={[s.row, s.mb8]}>
          <Text style={s.label}>{label}</Text>
          <Text style={s.underline}>{value}</Text>
        </View>
      ))}
    </Page>
  )
}

// ── Page 4: Benefits ──────────────────────────────────────────────────────────
function BenefitsPage({ t }: { t: BasicContractTemplate }) {
  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionTitle}>{t.slide4_title}</Text>
      <Text style={[s.p2Body, s.mb12]}>{t.slide4_intro}</Text>
      <Text style={s.benefitText}>{t.slide4_benefits}</Text>
    </Page>
  )
}

// ── Page 5: Terms ─────────────────────────────────────────────────────────────
function TermsPage({ t }: { t: BasicContractTemplate }) {
  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionTitle}>{t.slide5_title}</Text>
      <Text style={s.termsText}>{t.slide5_terms}</Text>
    </Page>
  )
}

// ── Page 6: Payment + Signatures ─────────────────────────────────────────────
function SignaturePage({ t, p }: { t: BasicContractTemplate; p: BasicContractPdfProps }) {
  const signedDate = formatSignedDate(p.signed_at, p.language)
  const isCredit = p.payment_method === 'credit'

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.sectionTitle}>{t.slide6_title}</Text>

      {/* Membership type + start date + monthly payment */}
      <View style={s.row}><Text style={s.label}>{t.slide6_type_label}</Text><Text style={s.value}>{t.slide6_type_value}</Text></View>
      <View style={s.row}><Text style={s.label}>{t.slide6_start_date_label}</Text><Text style={s.value}>{p.start_date}</Text></View>
      <View style={[s.row, s.mb12]}><Text style={s.label}>{t.slide6_monthly_label}</Text><Text style={s.value}>{t.slide6_monthly_value}</Text></View>

      {/* Payment method checkboxes */}
      <Text style={[s.label, s.mb4]}>{t.slide6_payment_method_label}</Text>
      <View style={s.payMethodRow}>
        <View style={s.payOption}>
          <View style={isCredit ? s.checkboxFilled : s.checkbox} />
          <Text style={{ fontSize: 9 }}>{t.slide6_credit}</Text>
        </View>
        <View style={s.payOption}>
          <View style={!isCredit ? s.checkboxFilled : s.checkbox} />
          <Text style={{ fontSize: 9 }}>{t.slide6_debit}</Text>
        </View>
      </View>

      {/* Card last4 */}
      <View style={[s.row, s.mb12]}>
        <Text style={s.label}>{t.slide6_card_last4_label}</Text>
        <Text style={s.underline}>{'**** **** **** ' + p.card_last4}</Text>
      </View>

      <View style={s.divider} />

      {/* Payment authorization + Cardholder signature (= client_signature_image) */}
      <Text style={[s.mb4, { fontSize: 10, fontFamily: 'Helvetica-Bold' }]}>{t.slide6_auth_title}</Text>
      <Text style={[s.p2Body, s.mb8]}>{t.slide6_auth_body}</Text>
      <Text style={[s.label, s.mb4]}>{t.slide6_cardholder_sig_label}</Text>
      {p.client_signature_image ? (
        <Image src={p.client_signature_image} style={s.sigImg} />
      ) : (
        <View style={s.sigArea} />
      )}
      <View style={[s.row, s.mb12]}>
        <Text style={s.label}>{t.slide6_date_label}</Text>
        <Text style={s.underline}>{signedDate}</Text>
      </View>

      <View style={s.divider} />

      {/* Agreement acceptance + Client signature (same image) */}
      <Text style={[s.mb4, { fontSize: 10, fontFamily: 'Helvetica-Bold' }]}>{t.slide6_acceptance_title}</Text>
      <Text style={[s.p2Body, s.mb8]}>{t.slide6_acceptance_body}</Text>
      <Text style={[s.label, s.mb4]}>{t.slide6_client_sig_label}</Text>
      {p.client_signature_image ? (
        <Image src={p.client_signature_image} style={s.sigImg} />
      ) : (
        <View style={s.sigArea} />
      )}
      <View style={[s.row, s.mb20]}>
        <Text style={s.label}>{t.slide6_date_label}</Text>
        <Text style={s.underline}>{signedDate}</Text>
      </View>

      {/* Representative signature */}
      <Text style={[s.label, s.mb4]}>{t.slide6_rep_label}</Text>
      {p.admin_signature_image ? (
        <Image src={p.admin_signature_image} style={s.sigImg} />
      ) : (
        <View style={s.sigArea} />
      )}
      <View style={s.row}>
        <Text style={s.label}>{t.slide6_date_label}</Text>
        <Text style={s.underline}>{signedDate}</Text>
      </View>

      {/* Forensic footer */}
      <View style={[s.divider, { marginTop: 20 }]} />
      <View style={s.footer}>
        <Text style={s.footerText}>
          Signed digitally on {signedDate}{p.signed_ip ? `  ·  IP: ${p.signed_ip}` : ''}
        </Text>
        {p.signed_user_agent && (
          <Text style={s.footerText}>User-Agent: {p.signed_user_agent}</Text>
        )}
        <Text style={[s.footerText, { marginTop: 4 }]}>
          This document was generated by {BUSINESS.legalName} for compliance and liability records. Do not alter or distribute without authorization.
        </Text>
      </View>
    </Page>
  )
}

// ── Document ──────────────────────────────────────────────────────────────────
function BasicMembershipContractDocument(props: BasicContractPdfProps) {
  const t = props.template
  const clientLastName = props.full_name.split(' ').pop() ?? props.full_name

  return (
    <Document
      title={`Basic Membership Contract — ${clientLastName}`}
      author={BUSINESS.legalName}
      creator={BUSINESS.legalName}
    >
      <TitlePage t={t} />
      <MarketingPage t={t} />
      <ClientInfoPage t={t} p={props} />
      <BenefitsPage t={t} />
      <TermsPage t={t} />
      <SignaturePage t={t} p={props} />
    </Document>
  )
}

export async function renderBasicMembershipContract(props: BasicContractPdfProps): Promise<Buffer> {
  return renderToBuffer(<BasicMembershipContractDocument {...props} />)
}
