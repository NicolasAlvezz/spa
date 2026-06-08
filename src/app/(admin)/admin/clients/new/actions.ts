'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildE164, phoneToAuthEmail } from '@/lib/phone'
import { sendWhatsAppMessage } from '@/lib/twilio'
import twilio from 'twilio'

export type InviteNewClientState =
  | { status: 'success'; phone: string }
  | { status: 'already_invited'; phone: string }
  | { status: 'error'; message: string }
  | undefined

async function sendInviteMessage(e164: string, channel: 'sms' | 'whatsapp') {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vmintegralmassage.vercel.app'
  const registrationLink = `${appUrl}/setup?phone=${encodeURIComponent(e164)}`
  const freeformBody = `Hola! 💆‍♀️ VM Integral Massage te invita a completar tu registro y acceder a tu perfil personal: ${registrationLink}`

  if (channel === 'whatsapp') {
    const contentSid = process.env.TWILIO_WHATSAPP_INVITE_CONTENT_SID

    if (contentSid) {
      // Production path — uses a Meta-approved template, so the message can be
      // sent to any user (no opt-in / no 24h window required).
      const from = process.env.TWILIO_WHATSAPP_FROM
      if (!from) throw new Error('[invite] TWILIO_WHATSAPP_FROM is not configured')

      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
      await client.messages.create({
        from,
        to: `whatsapp:${e164}`,
        contentSid,
        contentVariables: JSON.stringify({ '1': registrationLink }),
      })
      return
    }

    // Sandbox / dev path — freeform body. Only delivers to numbers that have
    // already joined the Twilio sandbox (or replied to the sender within 24h).
    await sendWhatsAppMessage(e164, freeformBody)
    return
  }

  // SMS path — requires TWILIO_SMS_FROM and an A2P 10DLC-approved number for US
  // destinations. Without registration, US carriers reject with error 30034.
  const smsFrom = process.env.TWILIO_SMS_FROM
  if (!smsFrom) {
    throw new Error('[invite] TWILIO_SMS_FROM is not configured')
  }
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  await client.messages.create({ from: smsFrom, to: e164, body: freeformBody })
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

  // New auth user — create it.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: phoneToAuthEmail(e164),
    password: e164,
    email_confirm: true,
    app_metadata: { role: 'client' },
  })

  if (authError || !authData.user) {
    return { status: 'error', message: 'generic_error' }
  }

  // If there's already a clients row for this phone with no user_id (created by
  // an admin without inviting), link it to the new auth user instead of leaving
  // an orphan that /setup will silently duplicate.
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id, user_id')
    .eq('phone', e164)
    .is('user_id', null)
    .maybeSingle()

  if (existingClient) {
    const { error: linkError } = await supabase
      .from('clients')
      .update({ user_id: authData.user.id })
      .eq('id', existingClient.id)
    if (linkError) {
      console.error('[invite] failed to link existing client to auth user:', linkError)
      // Roll back the auth user so the admin can retry cleanly.
      await supabase.auth.admin.deleteUser(authData.user.id)
      return { status: 'error', message: 'generic_error' }
    }
  }

  try {
    await sendInviteMessage(e164, channel)
  } catch (err) {
    console.error('[invite] Twilio error:', err)
    return { status: 'error', message: 'generic_error' }
  }

  return { status: 'success', phone: e164 }
}
