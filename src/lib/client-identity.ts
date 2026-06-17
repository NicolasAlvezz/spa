import { createServiceClient } from '@/lib/supabase/server'

/** Strips diacritics, lowercases, trims — for fuzzy name matching. */
export function normalizeName(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

/**
 * Returns true if the phone number belongs to a client who has already
 * completed registration: a `clients` row exists with `user_id NOT NULL`.
 * These clients must use /login, not /setup.
 */
export async function isClientFullyRegistered(e164: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', e164)
    .not('user_id', 'is', null)
    .maybeSingle()
  return data !== null
}
