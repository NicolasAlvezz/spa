import type { DbPayment } from '@/types'
import type { VisitWithServiceAndConsent } from '@/types'

export function buildVisitPaymentMap(payments: Pick<DbPayment, 'visit_id' | 'amount_usd'>[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const payment of payments) {
    if (payment.visit_id) {
      map.set(payment.visit_id, Number(payment.amount_usd))
    }
  }
  return map
}

export function getVisitDisplayPriceUsd(
  visit: VisitWithServiceAndConsent,
  visitPayments: Map<string, number>,
): number | null {
  if (visit.session_type === 'included' || visit.session_type === 'rollover') {
    return null
  }

  const paidAmount = visitPayments.get(visit.id)
  if (paidAmount != null && paidAmount > 0) {
    return paidAmount
  }

  if (visit.session_type === 'additional') {
    const planPrice =
      visit.memberships?.membership_plans?.additional_price_usd ??
      visit.memberships?.membership_plans?.price_usd
    if (planPrice != null) return Number(planPrice)
    if (visit.service_types?.price_usd != null) return Number(visit.service_types.price_usd)
    return null
  }

  if (visit.service_types?.price_usd != null) {
    return Number(visit.service_types.price_usd)
  }

  return null
}
