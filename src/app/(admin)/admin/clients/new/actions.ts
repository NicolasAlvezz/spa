'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildE164, phoneToAuthEmail } from '@/lib/phone'

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

  const prefix = (formData.get('phone_prefix') as string).trim()
  const localPhone = (formData.get('phone_local') as string).trim()
  const channel = formData.get('channel') as 'sms' | 'whatsapp'

  if (!prefix || !localPhone || !channel) {
    return { status: 'error', message: 'fill_all_fields' }
  }

  const e164 = buildE164(localPhone, prefix)
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

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: phoneToAuthEmail(e164),
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  fetch(`${appUrl}/api/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: e164, channel }),
  }).catch(() => {})

  return { status: 'success', phone: e164 }
}
