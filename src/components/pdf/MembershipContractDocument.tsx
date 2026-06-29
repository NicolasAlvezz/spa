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
import type { ContractLanguage } from '@/lib/constants/membership-contract'

export interface MembershipContractPdfLabels {
  doc_title: string
  section_client: string
  label_name: string
  label_phone: string
  label_address: string
  section_plan: string
  label_plan_name: string
  label_plan_price: string
  section_signature: string
  label_signed_at: string
  label_language: string
  label_version: string
  language_value: string
  section_terms: string
  footer_signed: string
  footer_ip: string
  footer_user_agent: string
  footer_disclaimer: string
}

export interface MembershipContractProps {
  // Client
  firstName: string
  lastName: string
  phone: string
  address: string
  // Plan
  planName: string
  priceUsd: number
  // Contract
  signedAt: string
  language: ContractLanguage
  version: string
  termsTitle: string
  termsBody: string
  signedIp: string | null
  signedUserAgent: string | null
  signatureImage: string | null
  // Localization labels
  labels: MembershipContractPdfLabels
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
  termsSection: {
    marginBottom: 14,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  termsTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#1f2937',
  },
  termsBody: {
    fontSize: 9,
    lineHeight: 1.6,
    color: '#374151',
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginVertical: 14,
  },
  signatureImage: {
    marginTop: 8,
    height: 80,
    objectFit: 'contain',
    alignSelf: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
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

function formatDateTime(iso: string, language: ContractLanguage): string {
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

function MembershipContractDocument(props: MembershipContractProps) {
  const {
    firstName, lastName, phone, address,
    planName, priceUsd,
    signedAt, language, version,
    termsTitle, termsBody,
    signedIp, signedUserAgent, signatureImage,
    labels,
  } = props

  const signedAtFmt = formatDateTime(signedAt, language)
  const footerSignedLine = labels.footer_signed.replace('{date}', signedAtFmt)

  return (
    <Document
      title={`Membership Contract — ${lastName}, ${firstName}`}
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

        {/* Plan info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.section_plan}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_plan_name}</Text>
            <Text style={styles.value}>{planName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_plan_price}</Text>
            <Text style={styles.value}>${priceUsd}/mo</Text>
          </View>
        </View>

        {/* Signature details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.section_signature}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_signed_at}</Text>
            <Text style={styles.value}>{signedAtFmt}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_language}</Text>
            <Text style={styles.value}>{labels.language_value}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{labels.label_version}</Text>
            <Text style={styles.value}>{version}</Text>
          </View>
          {signatureImage ? (
            <Image src={signatureImage} style={styles.signatureImage} />
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Contract terms snapshot */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{labels.section_terms}</Text>
          <View style={styles.termsSection}>
            <Text style={styles.termsTitle}>{termsTitle}</Text>
            <Text style={styles.termsBody}>{termsBody}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Footer — forensic evidence */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {footerSignedLine}
            {signedIp ? `  ·  ${labels.footer_ip}: ${signedIp}` : ''}
          </Text>
          {signedUserAgent ? (
            <Text style={styles.footerText}>
              {labels.footer_user_agent}: {signedUserAgent}
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

export async function renderMembershipContract(props: MembershipContractProps): Promise<Buffer> {
  return renderToBuffer(<MembershipContractDocument {...props} />)
}
