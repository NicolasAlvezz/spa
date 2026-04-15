import type { DbMembership, MembershipWithPlan } from '@/types'

export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'no_membership'

/**
 * Derives the real membership status by comparing expires_at with today.
 * The `status` column in the DB can lag — always prefer this function.
 */
export function getMembershipStatus(
  membership: Pick<DbMembership, 'expires_at' | 'status'> | null
): MembershipStatus {
  if (!membership) return 'no_membership'
  if (membership.status === 'cancelled') return 'cancelled'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiresAt = new Date(membership.expires_at)

  return expiresAt >= today ? 'active' : 'expired'
}

/**
 * Returns the number of sessions still available to use this month.
 * Counts both the monthly included session and any rollover sessions.
 */
export function getAvailableSessions(
  membership: Pick<DbMembership, 'sessions_used_this_month' | 'rollover_sessions'> | null,
  sessionsPerMonth: number
): number {
  if (!membership) return 0
  const total = sessionsPerMonth + membership.rollover_sessions
  return Math.max(0, total - membership.sessions_used_this_month)
}

/**
 * Calculates whether a rollover session should be granted at month renewal.
 * A rollover is granted if the client did not use all included sessions last month.
 * Max rollover is 1 session (enforced by the DB constraint).
 */
export function calculateRollover(
  sessionsUsedLastMonth: number,
  sessionsPerMonth: number,
  currentRollover: number
): number {
  const unusedSessions = sessionsPerMonth - sessionsUsedLastMonth
  // Cap at 1 rollover (business rule)
  return Math.min(1, currentRollover + Math.max(0, unusedSessions))
}

/**
 * Returns the "current" membership from an array:
 * - The active one (not cancelled, not expired), or
 * - The most recent one if none is active.
 */
export function getCurrentMembership(
  memberships: MembershipWithPlan[]
): MembershipWithPlan | null {
  if (!memberships.length) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const active = memberships.find(
    (m) => m.status !== 'cancelled' && new Date(m.expires_at) >= today
  )
  if (active) return active

  return (
    [...memberships].sort(
      (a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime()
    )[0] ?? null
  )
}
