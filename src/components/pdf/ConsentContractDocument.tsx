import React from 'react'
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'
import { BUSINESS } from '@/lib/constants/business'
import type { ConsentLanguage } from '@/lib/constants/consent'

/** PDF chrome labels — one set per language, passed in from the route. */
export interface ConsentPdfLabels {
  doc_title: string
  section_client: string
  label_name: string
  label_phone: string
  label_address: string
  section_visit: string
  label_visit_datetime: string
  section_signature: string
  label_signed_at: string
  label_language: string
  label_version: string
  language_value: string
  section_consent_text: string
  footer_signed: string
  footer_ip: string
  footer_user_agent: string
  footer_disclaimer: string
}

export interface ConsentContractProps {
  // Client
  firstName: string
  lastName: string
  phone: string
  address: string
  // Visit
  visitedAt: string
  // Consent
  acceptedAt: string
  language: ConsentLanguage
  version: string
  medicalTitle: string
  medicalBody: string
  agreementTitle: string
  agreementBody: string
  ipAddress: string | null
  userAgent: string | null
  // Localization
  labels: ConsentPdfLabels
}

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 48,
    color: '#111827',
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 16,
  },
  businessName: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  businessSub: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 1,
  },
  docTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    marginTop: 12,
    marginBottom: 4,
    color: '#1f2937',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#374151',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: 120,
    color: '#6b7280',
    fontFamily: 'Helvetica',
  },
  value: {
    flex: 1,
    color: '#111827',
  },
  consentSection: {
    marginBottom: 14,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  consentTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 5,
    color: '#1f2937',
  },
  consentBody: {
    fontSize: 9,
    lineHeight: 1.5,
    color: '#374151',
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginVertical: 14,
  },
  footer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  footerText: {
    fontSize: 8,
    color: '#6b7280',
    lineHeight: 1.5,
  },
})

function formatDateTime(iso: string, language: ConsentLanguage): string {
  try {
    const localeTag = language === 'es' ? 'es-US' : 'en-US'
    return new Date(iso).toLocaleString(localeTag, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: BUSINESS.timezone,
    }) + ' ET'
  } catch {
    return iso
  }
}

function ConsentContractDocument(props: ConsentContractProps) {
  const {
    firstName, lastName, phone, address,
    visitedAt,
    acceptedAt, language, version,
    medicalTitle, medicalBody, agreementTitle, agreementBody,
    ipAddress, userAgent,
    labels,
  } = props

  const visitedAtFmt = formatDateTime(visitedAt, language)
  const acceptedAtFmt = formatDateTime(acceptedAt, language)
  const footerSignedLine = labels.footer_signed.replace('{date}', acceptedAtFmt)

  return (
    <Document
      title={`Consent Contract — ${lastName}, ${firstName}`}
      author={BUSINESS.legalName}
      creator={BUSINESS.legalName}
    >
      <Page size="LETTER" style={styles.page}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.businessName}>{BUSINESS.legalName}</Text>
          <Text style={styles.businessSub}>{BUSINESS.address}</Text>
          <Text style={styles.businessSub}>
            {BUSINESS.phone}  ·  {BUSINESS.email}
          </Text>
          <Text style={styles.docTitle}>{labels.doc_title}</Text>
        </View>

        {/* Client info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.section_client}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_name}</Text>
            <Text style={styles.value}>{firstName} {lastName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_phone}</Text>
            <Text style={styles.value}>{phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_address}</Text>
            <Text style={styles.value}>{address}</Text>
          </View>
        </View>

        {/* Visit info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.section_visit}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_visit_datetime}</Text>
            <Text style={styles.value}>{visitedAtFmt}</Text>
          </View>
        </View>

        {/* Consent record */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.section_signature}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_signed_at}</Text>
            <Text style={styles.value}>{acceptedAtFmt}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_language}</Text>
            <Text style={styles.value}>{labels.language_value}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_version}</Text>
            <Text style={styles.value}>{version}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Consent text snapshot — already in the signing language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.section_consent_text}</Text>

          <View style={styles.consentSection}>
            <Text style={styles.consentTitle}>{medicalTitle}</Text>
            <Text style={styles.consentBody}>{medicalBody}</Text>
          </View>

          <View style={styles.consentSection}>
            <Text style={styles.consentTitle}>{agreementTitle}</Text>
            <Text style={styles.consentBody}>{agreementBody}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Footer — digital signature evidence */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {footerSignedLine}
            {ipAddress ? `  ·  ${labels.footer_ip}: ${ipAddress}` : ''}
          </Text>
          {userAgent ? (
            <Text style={styles.footerText}>
              {labels.footer_user_agent}: {userAgent}
            </Text>
          ) : null}
          <Text style={[styles.footerText, { marginTop: 4 }]}>
            {labels.footer_disclaimer}
          </Text>
        </View>

      </Page>
    </Document>
  )
}

export async function renderConsentContract(props: ConsentContractProps): Promise<Buffer> {
  return renderToBuffer(<ConsentContractDocument {...props} />)
}
