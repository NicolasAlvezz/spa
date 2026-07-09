import enMessages from '../../../messages/en.json'
import esMessages from '../../../messages/es.json'

export const MEMBERSHIP_CONTRACT_VERSION = 'membership-v1.0'
export const BASIC_CONTRACT_VERSION = 'basic-v1.0'
export const BASIC_TEMPLATE_ID = 'basic'

export const MEMBERSHIP_REQUEST_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours — clients often sign remotely from /admin/clients

export type ContractLanguage = 'en' | 'es'

export interface ContractSnapshot {
  terms_title: string
  terms_body: string
}

export interface PlanContractFields {
  contract_title_en: string | null
  contract_title_es: string | null
  contract_body_en: string | null
  contract_body_es: string | null
}

/**
 * Returns the contract snapshot for a plan, using the plan's own contract text
 * if set, otherwise falling back to the generic text from messages/*.json.
 */
export function getPlanContractSnapshot(
  plan: PlanContractFields,
  language: ContractLanguage,
): ContractSnapshot {
  const titleKey = language === 'es' ? 'contract_title_es' : 'contract_title_en'
  const bodyKey  = language === 'es' ? 'contract_body_es'  : 'contract_body_en'
  const planTitle = plan[titleKey]
  const planBody  = plan[bodyKey]

  if (planTitle && planBody) {
    return { terms_title: planTitle, terms_body: planBody }
  }

  return getContractSnapshot(language)
}

/**
 * Generic fallback contract snapshot from messages/*.json.
 */
export function getContractSnapshot(language: ContractLanguage): ContractSnapshot {
  const mc = (language === 'es' ? esMessages : enMessages).membership_contract
  return {
    terms_title: mc.terms_title,
    terms_body:  mc.terms_body,
  }
}
