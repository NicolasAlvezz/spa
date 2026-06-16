import enMessages from '../../../messages/en.json'
import esMessages from '../../../messages/es.json'

export const MEMBERSHIP_CONTRACT_VERSION = 'membership-v1.0'

export const MEMBERSHIP_REQUEST_TTL_MS = 30 * 60 * 1000 // 30 minutes

export type ContractLanguage = 'en' | 'es'

export interface ContractSnapshot {
  terms_title: string
  terms_body: string
}

/**
 * Server-side source of truth for the membership contract text snapshot.
 * Text is taken from messages/*.json at request creation time so the stored
 * snapshot cannot be tampered with from the browser.
 */
export function getContractSnapshot(language: ContractLanguage): ContractSnapshot {
  const mc = (language === 'es' ? esMessages : enMessages).membership_contract
  return {
    terms_title: mc.terms_title,
    terms_body:  mc.terms_body,
  }
}
