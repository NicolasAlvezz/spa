import type { createServiceClient } from '@/lib/supabase/server'
import { calculateRollover } from '@/lib/utils/membership'

type ServiceClient = ReturnType<typeof createServiceClient>

interface SessionCycleState {
  sessions_used_this_month: number
  rollover_sessions: number
  next_session_reset_at: string | null
}

interface SessionCycleUpdate {
  sessions_used_this_month: number
  rollover_sessions: number
  next_session_reset_at: string
}

export function addOneMonth(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCMonth(d.getUTCMonth() + 1)
  return d.toISOString().split('T')[0]
}

/**
 * The included monthly session renews one month after the purchase date
 * (anniversary), not on the calendar month. This is a pure computation: if
 * next_session_reset_at has passed (once or, if the client hasn't visited in a
 * while, several times), it returns the reset state — otherwise null.
 */
export function computeSessionCycleReset(
  state: SessionCycleState,
  sessionsPerMonth: number,
  todayStr: string,
): SessionCycleUpdate | null {
  if (!state.next_session_reset_at || state.next_session_reset_at > todayStr) {
    return null
  }

  let sessionsUsed = state.sessions_used_this_month
  let rollover = state.rollover_sessions
  let nextReset = state.next_session_reset_at

  while (nextReset <= todayStr) {
    rollover = calculateRollover(sessionsUsed, sessionsPerMonth, 0)
    sessionsUsed = 0
    nextReset = addOneMonth(nextReset)
  }

  return {
    sessions_used_this_month: sessionsUsed,
    rollover_sessions: rollover,
    next_session_reset_at: nextReset,
  }
}

/**
 * Applies computeSessionCycleReset and persists it if a reset is due. Safe to
 * call from multiple request paths — a redundant update is harmless (same
 * read-then-write tolerance already used elsewhere in this codebase).
 */
export async function reconcileSessionCycle(
  supabase: ServiceClient,
  membershipId: string,
  state: SessionCycleState,
  sessionsPerMonth: number,
  todayStr: string,
): Promise<SessionCycleUpdate | null> {
  const update = computeSessionCycleReset(state, sessionsPerMonth, todayStr)
  if (!update) return null

  await supabase
    .from('memberships')
    .update(update)
    .eq('id', membershipId)

  return update
}
