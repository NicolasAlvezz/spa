'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildE164, phoneToAuthEmail } from '@/lib/phone'
import twilio from 'twilio'

export type InviteNewClientState =
  | { status: 'success'; phone: string }
  | { status: 'already_invited'; phone: string }
  | { status: 'error'; message: string }
  | undefined

async function sendInviteMessage(e164: string, channel: 'sms' | 'whatsapp') {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vmintegralmassage.vercel.app'
  const body = `Hola! 💆‍♀️ VM Integral Massage te invita a completar tu registro y acceder a tu perfil personal: ${appUrl}/setup?phone=${encodeURIComponent(e164)}`
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
  const confirmResend = formData.get('confirm_resend') === 'true'

  if (!prefix || !localPhone || !channel) {
    return { status: 'error', message: 'fill_all_fields' }
  }

  const e164 = buildE164(localPhone, prefix)
  const supabase = createServiceClient()

  // Check if this phone already has an auth user
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existingAuthUser = users.find(u => u.email === phoneToAuthEmail(e164))

  if (existingAuthUser) {
    if (!confirmResend) {
      // Ask admin to confirm before resending
      return { status: 'already_invited', phone: e164 }
    }
    // Admin confirmed → just resend the message
    try {
      await sendInviteMessage(e164, channel)
    } catch (err) {
      console.error('[invite] Twilio resend error:', err)
      return { status: 'error', message: 'generic_error' }
    }
    return { status: 'success', phone: e164 }
  }

  // New user — create auth account
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: phoneToAuthEmail(e164),
    password: e164,
    email_confirm: true,
    app_metadata: { role: 'client' },
  })

  if (authError || !authData.user) {
    return { status: 'error', message: 'generic_error' }
  }

  try {
    await sendInviteMessage(e164, channel)
  } catch (err) {
    console.error('[invite] Twilio error:', err)
  }

  return { status: 'success', phone: e164 }
}
