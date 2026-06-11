import enMessages from '../../../messages/en.json'
import esMessages from '../../../messages/es.json'

/** Bump this when the consent text in messages/*.json changes. */
export const CONSENT_VERSION = 'v1.0'

/**
 * Time window in which a signed-and-unconsumed consent is considered active.
 *
 * Used by:
 *  - getActiveConsentForClient() to skip re-prompting on /my-qr refreshes
 *  - associateConsent() in POST /api/visits to link the signature to the visit
 *
 * Keep both call sites in sync via this constant only.
 */
export const CONSENT_WINDOW_MS = 4 * 60 * 60 * 1000 // 4 hours

export type ConsentLanguage = 'en' | 'es'

export interface ConsentSnapshot {
  medical_title: string
  medical_body: string
  agreement_title: string
  agreement_body: string
}

/**
 * Server-side source of truth for the consent text snapshot.
 *
 * The client UI shows the text from messages/*.json, but the *persisted*
 * snapshot must always come from here so it cannot be tampered with from the
 * browser. This is what gives the stored consent its legal weight.
 */
export function getConsentSnapshot(language: ConsentLanguage): ConsentSnapshot {
  const consent = (language === 'es' ? esMessages : enMessages).consent
  return {
    medical_title: consent.medical_title,
    medical_body: consent.medical_body,
    agreement_title: consent.agreement_title,
    agreement_body: consent.agreement_body,
  }
}
