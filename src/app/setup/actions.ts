'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildE164, phoneToAuthEmail } from '@/lib/phone'
import { normalizeName } from '@/lib/client-identity'
import { redirect } from 'next/navigation'

export async function setupAccount(
  formData: FormData
): Promise<{ error: string } | never> {
  const firstName = (formData.get('first_name') as string).trim()
  const lastName = (formData.get('last_name') as string).trim()
  const prefix = (formData.get('phone_prefix') as string).trim()
  const localPhone = (formData.get('phone_local') as string).trim()

  if (!firstName || !lastName || !prefix || !localPhone) {
    return { error: 'fill_all_fields' }
  }

  const e164 = buildE164(localPhone, prefix)

  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email: phoneToAuthEmail(e164),
    password: e164,
  })

  if (authError || !data.user) {
    return { error: 'phone_not_found' }
  }

  const service = createServiceClient()
  const { data: existing } = await service
    .from('clients')
    .select('id, user_id, first_name, last_name')
    .eq('phone', e164)
    .maybeSingle()

  // Already fully registered — /setup is for first-time only.
  if (existing?.user_id) {
    await supabase.auth.signOut()
    return { error: 'already_registered' }
  }

  // Orphan row (admin pre-registered client data, no auth link yet).
  // Validate submitted names match what the admin entered.
  if (existing && !existing.user_id) {
    const dbFirst = normalizeName(existing.first_name ?? '')
    const dbLast = normalizeName(existing.last_name ?? '')
    if (normalizeName(firstName) !== dbFirst || normalizeName(lastName) !== dbLast) {
      await supabase.auth.signOut()
      return { error: 'identity_mismatch' }
    }
    const { error: linkError } = await service
      .from('clients')
      .update({ user_id: data.user.id })
      .eq('id', existing.id)
    if (linkError) {
      await supabase.auth.signOut()
      return { error: 'generic_error' }
    }
    redirect('/onboarding')
  }

  // No client row at all — fresh registration.
  const { error: insertError } = await service.from('clients').insert({
    user_id: data.user.id,
    first_name: firstName,
    last_name: lastName,
    phone: e164,
    address: '',
  })

  if (insertError) {
    await supabase.auth.signOut()
    return { error: 'generic_error' }
  }

  redirect('/onboarding')
}
