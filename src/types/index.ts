import type { Database } from './database'

// ─── Raw DB rows (shorthand) ──────────────────────────────────────────────────

export type DbClient = Database['public']['Tables']['clients']['Row']
export type DbMembership = Database['public']['Tables']['memberships']['Row']
export type DbMembershipPlan = Database['public']['Tables']['membership_plans']['Row']
export type DbPayment = Database['public']['Tables']['payments']['Row']
export type DbVisit = Database['public']['Tables']['visits']['Row']
export type DbServiceType = Database['public']['Tables']['service_types']['Row']

// ─── Domain enums ─────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'client'
export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'no_membership'
export type PaymentMethod = 'cash' | 'debit' | 'credit'
export type PaymentConcept = 'monthly_membership' | 'additional_visit' | 'welcome_offer'
export type SessionType = 'included' | 'rollover' | 'additional' | 'welcome_offer'
export type HowDidYouHear =
  | 'instagram'
  | 'referral'
  | 'google'
  | 'facebook'
  | 'flyer'
  | 'walk_in'
  | 'other'

// ─── Enriched domain types ────────────────────────────────────────────────────

// Client with computed full name
export interface Client extends DbClient {
  full_name: string
}

// Membership joined with its plan
export interface MembershipWithPlan extends DbMembership {
  plan: DbMembershipPlan
}

// ─── API response shapes ──────────────────────────────────────────────────────

// Response from GET /api/clients/[uuid]/checkin
export interface CheckinResult {
  client: Pick<DbClient, 'id' | 'first_name' | 'last_name' | 'phone' | 'preferred_language'>
  membership: MembershipWithPlan | null
  membership_status: MembershipStatus
  sessions_used_this_month: number
  rollover_sessions: number
  visits_this_month: DbVisit[]
  last_payment: DbPayment | null
}

// ─── Form input types ─────────────────────────────────────────────────────────

export interface CreateClientInput {
  first_name: string
  last_name: string
  phone: string
  address: string
  email?: string
  how_did_you_hear?: HowDidYouHear
  first_visit_date?: string
  is_healthcare_worker?: boolean
  work_id_verified?: boolean
  preferred_language?: 'en' | 'es'
  notes?: string
  // Optional: create membership immediately on registration
  plan_id?: string
  payment_method?: PaymentMethod
}

export interface CreateMembershipInput {
  client_id: string
  plan_id: string
  started_at: string
  payment: {
    amount_usd: number
    method: PaymentMethod
    concept: PaymentConcept
  }
}

export interface CreatePaymentInput {
  client_id: string
  membership_id?: string
  amount_usd: number
  method: PaymentMethod
  concept: PaymentConcept
  paid_at?: string
  notes?: string
}

export interface RegisterVisitInput {
  client_id: string
  membership_id?: string
  service_type_id?: string
  session_type?: SessionType
  notes?: string
}
