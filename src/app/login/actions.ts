'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildE164, phoneToAuthEmail } from '@/lib/phone'
import { redirect } from 'next/navigation'

export async function loginWithNameAndPhone(
  formData: FormData
): Promise<{ error: string } | never> {
  const firstName = (formData.get('first_name') as string).trim()
  const prefix = (formData.get('phone_prefix') as string).trim()
  const localPhone = (formData.get('phone_local') as string).trim()

  if (!firstName || !prefix || !localPhone) {
    return { error: 'error_not_found' }
  }

  const e164 = buildE164(localPhone, prefix)

  // Verify the client exists with this name + phone
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
    email: phoneToAuthEmail(e164),
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
