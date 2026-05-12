'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildE164, phoneToAuthEmail } from '@/lib/phone'
import twilio from 'twilio'

export type InviteNewClientState =
  | { status: 'success'; phone: string }
  | { status: 'error'; message: string }
  | undefined

async function sendInviteMessage(e164: string, channel: 'sms' | 'whatsapp') {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vmintegralmassage.vercel.app'
  const body = `Hola! 💆‍♀️ VM Integral Massage te invita a completar tu registro y acceder a tu perfil personal: ${appUrl}/setup`

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  const from = channel === 'whatsapp' ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM
  const to = channel === 'whatsapp' ? `whatsapp:${e164}` : e164

  await client.messages.create({ from, to, body })
}

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

  try {
    await sendInviteMessage(e164, channel)
  } catch (err) {
    console.error('[invite] Twilio error:', err)
    // Auth user was created — don't fail the whole action, just log
  }

  return { status: 'success', phone: e164 }
}
