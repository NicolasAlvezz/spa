import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getCurrentMembership, getMembershipStatus } from '@/lib/utils/membership'
import type { MembershipWithPlan, SessionType } from '@/types'

type ServiceClient = SupabaseClient<Database>

/**
 * When the scan UI is stale (e.g. right after signing a contract), the client may
 * POST without membership_id even though the client now has an active plan.
 * Auto-link so the visit consumes the correct session instead of becoming a stray row.
 */
export async function resolveMembershipIdForVisit(
  supabase: ServiceClient,
  clientId: string,
  membershipId: string | null,
  options: { sessionType?: SessionType; serviceTypeId?: string | undefined },
): Promise<string | null> {
  if (membershipId) return membershipId

  // Deliberate non-membership visit flows
  if (options.sessionType === 'post_op' || options.serviceTypeId) {
    return null
  }

  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('*, membership_plans(*)')
    .eq('client_id', clientId)
    .neq('status', 'cancelled')

  if (error || !memberships?.length) return null

  const current = getCurrentMembership(memberships as unknown as MembershipWithPlan[])
  if (!current || getMembershipStatus(current) !== 'active') return null

  return current.id
}
