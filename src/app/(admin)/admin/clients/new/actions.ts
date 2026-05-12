'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { toE164, phoneToAuthEmail } from '@/lib/phone'

export type InviteNewClientState =
  | { status: 'success'; phone: string }
  | { status: 'error'; message: string }
  | undefined

export async function inviteNewClientAction(
  _prev: InviteNewClientState,
  formData: FormData
): Promise<InviteNewClientState> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return { status: 'error', message: 'unauthorized' }
  }

  const phone = (formData.get('phone') as string).trim()
  const channel = formData.get('channel') as 'sms' | 'whatsapp'

  if (!phone || !channel) {
    return { status: 'error', message: 'fill_all_fields' }
  }

  const e164 = toE164(phone)
  const supabase = createServiceClient()

  // Check if phone already registered
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('phone', e164)
    .maybeSingle()

  if (existing) {
    return { status: 'error', message: 'phone_taken' }
  }

  // Create auth user with phone-derived credentials (no clients record yet — client fills that in)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: phoneToAuthEmail(phone),
    password: e164,
    email_confirm: true,
    app_metadata: { role: 'client' },
  })

  if (authError || !authData.user) {
    if (authError?.message?.includes('already registered')) {
      return { status: 'error', message: 'phone_taken' }
    }
    return { status: 'error', message: 'generic_error' }
  }

  // Send Twilio invite linking to /setup so the client can fill in their own name
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  fetch(`${appUrl}/api/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: e164, channel }),
  }).catch(() => {})

  return { status: 'success', phone: e164 }
}
