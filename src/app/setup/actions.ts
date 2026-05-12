'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { toE164, phoneToAuthEmail } from '@/lib/phone'
import { redirect } from 'next/navigation'

export async function setupAccount(
  formData: FormData
): Promise<{ error: string } | never> {
  const firstName = (formData.get('first_name') as string).trim()
  const lastName = (formData.get('last_name') as string).trim()
  const phone = (formData.get('phone') as string).trim()

  if (!firstName || !lastName || !phone) {
    return { error: 'fill_all_fields' }
  }

  const e164 = toE164(phone)

  // Sign in using phone-derived credentials
  const supabase = await createClient()
  const { data, error: authError } = await supabase.auth.signInWithPassword({
    email: phoneToAuthEmail(phone),
    password: e164,
  })

  if (authError || !data.user) {
    return { error: 'phone_not_found' }
  }

  // Ensure no clients record already exists for this phone
  const service = createServiceClient()
  const { data: existing } = await service
    .from('clients')
    .select('id')
    .eq('phone', e164)
    .maybeSingle()

  if (existing) {
    // Already registered — just go to the app
    redirect('/my-qr')
  }

  // Create the clients record
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
