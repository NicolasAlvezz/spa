import type { DbMembership, MembershipWithPlan } from '@/types'

export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'no_membership'

export function isPack(membership: Pick<DbMembership, 'sessions_remaining'> & { membership_plans: { plan_type: string } | null }): boolean {
  return membership.membership_plans?.plan_type === 'pack'
}

/**
 * Derives the real membership status.
 * For packs: active = sessions_remaining > 0.
 * For monthly: active = expires_at >= today.
 * The `status` column in the DB can lag — always prefer this function.
 */
export function getMembershipStatus(
  membership: Pick<DbMembership, 'expires_at' | 'status' | 'sessions_remaining'> & { membership_plans?: { plan_type: string } | null } | null
): MembershipStatus {
  if (!membership) return 'no_membership'
  if (membership.status === 'cancelled') return 'cancelled'

  if (membership.membership_plans?.plan_type === 'pack') {
    return (membership.sessions_remaining ?? 0) > 0 ? 'active' : 'expired'
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

  const active = memberships.find((m) => {
    if (m.status === 'cancelled') return false
    if (m.membership_plans?.plan_type === 'pack') {
      return (m.sessions_remaining ?? 0) > 0
    }
    return new Date(m.expires_at) >= today
  })
  if (active) return active

  return (
    [...memberships].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] ?? null
  )
}
