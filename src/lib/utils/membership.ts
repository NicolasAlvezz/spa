import type { DbMembership, MembershipWithPlan } from '@/types'

export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'no_membership'

export const PACK_VALIDITY_MONTHS = 2

export function isPackPlan(plan: { plan_type: string } | null | undefined): boolean {
  return plan?.plan_type === 'pack'
}

export function getPackExpiryDate(
  membership: Pick<DbMembership, 'expires_at' | 'started_at'>
): string {
  if (membership.expires_at) {
    return membership.expires_at.split('T')[0]
  }
  const expiry = new Date(membership.started_at + 'T12:00:00Z')
  expiry.setUTCMonth(expiry.getUTCMonth() + PACK_VALIDITY_MONTHS)
  return expiry.toISOString().split('T')[0]
}

export function getPackServiceLabel(locale: 'en' | 'es'): string {
  return locale === 'es'
    ? 'Masajes post-operatorios (60 min)'
    : 'Post-operative massages (60 min)'
}

export function isPackMembership(
  membership: Pick<DbMembership, 'sessions_remaining'> & { membership_plans: { plan_type: string } | null }
): boolean {
  return membership.membership_plans?.plan_type === 'pack'
}

/** @deprecated Use isPackMembership */
export function isPack(
  membership: Pick<DbMembership, 'sessions_remaining'> & { membership_plans: { plan_type: string } | null }
): boolean {
  return isPackMembership(membership)
}

/**
 * Derives the real membership status.
 * For packs: active = sessions_remaining > 0.
 * For monthly: active = expires_at >= today.
 * The `status` column in the DB can lag — always prefer this function.
 */
export function getMembershipStatus(
  membership: Pick<DbMembership, 'expires_at' | 'status' | 'sessions_remaining' | 'started_at'> & { membership_plans?: { plan_type: string } | null } | null
): MembershipStatus {
  if (!membership) return 'no_membership'
  if (membership.status === 'cancelled') return 'cancelled'
  if (membership.status === 'expired') return 'expired'

  if (membership.membership_plans?.plan_type === 'pack') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiresAt = new Date(getPackExpiryDate(membership) + 'T12:00:00Z')
    if (expiresAt < today || (membership.sessions_remaining ?? 0) <= 0) return 'expired'
    return 'active'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiresAt = new Date(membership.expires_at)

  return expiresAt >= today ? 'active' : 'expired'
}

/**
 * Returns the number of sessions still available.
 * For packs: returns sessions_remaining directly.
 * For monthly: counts included + rollover - used.
 */
export function getAvailableSessions(
  membership: Pick<DbMembership, 'sessions_used_this_month' | 'rollover_sessions' | 'sessions_remaining'> & { membership_plans?: { plan_type: string; sessions_per_month: number } | null } | null,
  sessionsPerMonth: number
): number {
  if (!membership) return 0
  if (membership.membership_plans?.plan_type === 'pack') {
    return membership.sessions_remaining ?? 0
  }
  const total = sessionsPerMonth + membership.rollover_sessions
  return Math.max(0, total - membership.sessions_used_this_month)
}

/**
 * Calculates whether a rollover session should be granted at month renewal.
 * Only applies to monthly plans.
 */
export function calculateRollover(
  sessionsUsedLastMonth: number,
  sessionsPerMonth: number,
  currentRollover: number
): number {
  const unusedSessions = sessionsPerMonth - sessionsUsedLastMonth
  return Math.min(1, currentRollover + Math.max(0, unusedSessions))
}

/**
 * Returns the "current" membership from an array:
 * - The active one (not cancelled, not expired/exhausted), or
 * - The most recent one if none is active.
 */
export function getCurrentMembership(
  memberships: MembershipWithPlan[]
): MembershipWithPlan | null {
  if (!memberships.length) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Sort newest first so duplicates resolve deterministically.
  const sorted = [...memberships].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const active = sorted.find((m) => {
    if (m.status === 'cancelled') return false
    if (m.status === 'expired') return false
    if (m.membership_plans?.plan_type === 'pack') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiresAt = new Date(getPackExpiryDate(m) + 'T12:00:00Z')
      return expiresAt >= today && (m.sessions_remaining ?? 0) > 0
    }
    return new Date(m.expires_at) >= today
  })

  return active ?? sorted[0] ?? null
}
