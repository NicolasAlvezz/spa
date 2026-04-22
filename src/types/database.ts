// Auto-generate this file with:
// npx supabase gen types typescript --local > src/types/database.ts
// Manual version based on docs/database-schema.md

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          user_id: string | null
          first_name: string
          last_name: string
          phone: string
          address: string
          email: string | null
          how_did_you_hear: string | null
          first_visit_date: string | null
          is_healthcare_worker: boolean
          work_id_verified: boolean
          preferred_language: 'en' | 'es'
          notes: string | null
          qr_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          first_name: string
          last_name: string
          phone: string
          address: string
          email?: string | null
          how_did_you_hear?: string | null
          first_visit_date?: string | null
          is_healthcare_worker?: boolean
          work_id_verified?: boolean
          preferred_language?: 'en' | 'es'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string | null
          first_name?: string
          last_name?: string
          phone?: string
          address?: string
          email?: string | null
          how_did_you_hear?: string | null
          first_visit_date?: string | null
          is_healthcare_worker?: boolean
          work_id_verified?: boolean
          preferred_language?: 'en' | 'es'
          notes?: string | null
          updated_at?: string
        }
        Relationships: Relationship[]
      }
      membership_plans: {
        Row: {
          id: string
          slug: string
          name_en: string
          name_es: string
          price_usd: number
          sessions_per_month: number
          rollover_max: number
          min_months: number
          extras_en: string[]
          extras_es: string[]
          requires_healthcare: boolean
          is_active: boolean
          created_at: string
          plan_type: 'monthly' | 'pack'
          total_sessions: number | null
          allows_split_payment: boolean
          split_first_amount: number | null
        }
        Insert: {
          id?: string
          slug: string
          name_en: string
          name_es: string
          price_usd: number
          sessions_per_month?: number
          rollover_max?: number
          min_months?: number
          extras_en?: string[]
          extras_es?: string[]
          requires_healthcare?: boolean
          is_active?: boolean
          created_at?: string
          plan_type?: 'monthly' | 'pack'
          total_sessions?: number | null
          allows_split_payment?: boolean
          split_first_amount?: number | null
        }
        Update: {
          slug?: string
          name_en?: string
          name_es?: string
          price_usd?: number
          sessions_per_month?: number
          rollover_max?: number
          min_months?: number
          extras_en?: string[]
          extras_es?: string[]
          requires_healthcare?: boolean
          is_active?: boolean
          plan_type?: 'monthly' | 'pack'
          total_sessions?: number | null
          allows_split_payment?: boolean
          split_first_amount?: number | null
        }
        Relationships: Relationship[]
      }
      memberships: {
        Row: {
          id: string
          client_id: string
          plan_id: string
          started_at: string
          expires_at: string
          status: 'active' | 'expired' | 'cancelled'
          sessions_used_this_month: number
          rollover_sessions: number
          months_committed: number
          months_completed: number
          welcome_offer_used: boolean
          created_at: string
          updated_at: string
          sessions_remaining: number | null
          split_payment_pending: boolean
        }
        Insert: {
          id?: string
          client_id: string
          plan_id: string
          started_at?: string
          expires_at: string
          status?: 'active' | 'expired' | 'cancelled'
          sessions_used_this_month?: number
          rollover_sessions?: number
          months_committed?: number
          months_completed?: number
          welcome_offer_used?: boolean
          created_at?: string
          updated_at?: string
          sessions_remaining?: number | null
          split_payment_pending?: boolean
        }
        Update: {
          plan_id?: string
          started_at?: string
          expires_at?: string
          status?: 'active' | 'expired' | 'cancelled'
          sessions_used_this_month?: number
          rollover_sessions?: number
          months_committed?: number
          months_completed?: number
          welcome_offer_used?: boolean
          updated_at?: string
          sessions_remaining?: number | null
          split_payment_pending?: boolean
        }
        Relationships: Relationship[]
      }
      payments: {
        Row: {
          id: string
          client_id: string
          membership_id: string | null
          amount_usd: number
          method: 'cash' | 'debit' | 'credit'
          concept: 'monthly_membership' | 'additional_visit' | 'welcome_offer' | 'pack_purchase' | 'pack_split_second' | 'post_op_visit'
          paid_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          membership_id?: string | null
          amount_usd: number
          method: 'cash' | 'debit' | 'credit'
          concept: 'monthly_membership' | 'additional_visit' | 'welcome_offer' | 'pack_purchase' | 'pack_split_second' | 'post_op_visit'
          paid_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          notes?: string | null
        }
        Relationships: Relationship[]
      }
      visits: {
        Row: {
          id: string
          client_id: string
          membership_id: string | null
          service_type_id: string | null
          visited_at: string
          session_type: 'included' | 'rollover' | 'additional' | 'welcome_offer' | 'post_op'
          registered_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          membership_id?: string | null
          service_type_id?: string | null
          visited_at?: string
          session_type?: 'included' | 'rollover' | 'additional' | 'welcome_offer' | 'post_op'
          registered_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          service_type_id?: string | null
          notes?: string | null
        }
        Relationships: Relationship[]
      }
      service_types: {
        Row: {
          id: string
          slug: string
          name_en: string
          name_es: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name_en: string
          name_es: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name_en?: string
          name_es?: string
          is_active?: boolean
        }
        Relationships: Relationship[]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
