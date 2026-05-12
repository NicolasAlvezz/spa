'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { phoneToAuthEmail, toE164 } from '@/lib/phone'
import { redirect } from 'next/navigation'

export async function loginWithNameAndPhone(
  formData: FormData
): Promise<{ error: string } | never> {
  const firstName = (formData.get('first_name') as string).trim()
  const phone = (formData.get('phone') as string).trim()

  if (!firstName || !phone) {
    return { error: 'error_not_found' }
  }

  const e164 = toE164(phone)

  // Verify the client exists with this name + phone (bypass RLS with service client)
  const service = createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('id')
    .eq('phone', e164)
    .ilike('first_name', firstName)
    .maybeSingle()

  if (!client) {
    return { error: 'error_not_found' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: phoneToAuthEmail(phone),
    password: e164,
  })

  if (error || !data.user) {
    return { error: 'error_not_found' }
  }

  const role = data.user.app_metadata?.role as 'admin' | 'client' | undefined
  redirect(role === 'admin' ? '/admin' : '/my-qr')
}

export async function logout(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
