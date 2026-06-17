'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { buildE164, phoneToAuthEmail } from '@/lib/phone'
import { buildInviteMessage } from '@/lib/invite-message'
import { isClientFullyRegistered } from '@/lib/client-identity'
import twilio from 'twilio'

export type InviteNewClientState =
  | { status: 'success'; phone: string }
  | { status: 'already_invited'; phone: string }
  | { status: 'already_registered'; phone: string }
  | { status: 'error'; message: string }
  | undefined

async function sendInviteMessage(e164: string, channel: 'sms' | 'whatsapp'): Promise<void> {
  if (channel === 'whatsapp') {
    // WhatsApp invites are sent manually via wa.me from the admin UI.
    return
  }

  const freeformBody = buildInviteMessage(e164)
  const smsFrom = process.env.TWILIO_SMS_FROM
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!smsFrom || !accountSid || !authToken) {
    console.error('[invite] Twilio SMS is not configured')
    throw new Error('twilio_not_configured')
  }

  const client = twilio(accountSid, authToken)
  await client.messages.create({ from: smsFrom, to: e164, body: freeformBody })
}

export async function inviteNewClientAction(
  _prev: InviteNewClientState,
  formData: FormData
): Promise<InviteNewClientState> {
  try {
  const authClient = await createClient()
  const { data: authData, error: authError } = await authClient.auth.getUser()
  const user = authData?.user
  if (authError || !user || user.app_metadata?.role !== 'admin') {
    return { status: 'error', message: 'unauthorized' }
  }

  const prefix = (formData.get('phone_prefix') as string | null)?.trim() ?? ''
  const localPhone = (formData.get('phone_local') as string | null)?.trim() ?? ''
  const channel = formData.get('channel') as 'sms' | 'whatsapp' | null
  const confirmResend = formData.get('confirm_resend') === 'true'

  if (!prefix || !localPhone || !channel) {
    return { status: 'error', message: 'fill_all_fields' }
  }

  const e164 = buildE164(localPhone, prefix)

  // Block invite if the client already completed registration.
  if (await isClientFullyRegistered(e164)) {
    return { status: 'already_registered', phone: e164 }
  }

  const supabase = createServiceClient()

  // Check if this phone already has an auth user (pending setup)
  const { data: usersData, error: listUsersError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (listUsersError || !usersData?.users) {
    console.error('[invite] listUsers error:', listUsersError)
    return { status: 'error', message: 'generic_error' }
  }
  const existingAuthUser = usersData.users.find(u => u.email === phoneToAuthEmail(e164))

  if (existingAuthUser) {
    if (!confirmResend) {
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
  const { data: createdAuth, error: createUserError } = await supabase.auth.admin.createUser({
    email: phoneToAuthEmail(e164),
    password: e164,
    email_confirm: true,
    app_metadata: { role: 'client' },
  })

  if (createUserError || !createdAuth.user) {
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
      .update({ user_id: createdAuth.user.id })
      .eq('id', existingClient.id)
    if (linkError) {
      console.error('[invite] failed to link existing client to auth user:', linkError)
      await supabase.auth.admin.deleteUser(createdAuth.user.id)
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
  } catch (err) {
    console.error('[invite] unexpected error:', err)
    return { status: 'error', message: 'generic_error' }
  }
}

// ---------------------------------------------------------------------------
// QR-only flow: ensure auth user exists without sending any message.
// ---------------------------------------------------------------------------

export type EnsureAuthUserForQrResult =
  | { status: 'ok' }
  | { status: 'already_registered' }
  | { status: 'error'; message: string }

export async function ensureAuthUserForQrAction(
  e164: string
): Promise<EnsureAuthUserForQrResult> {
  try {
    const authClient = await createClient()
    const { data: authData, error: authError } = await authClient.auth.getUser()
    const user = authData?.user
    if (authError || !user || user.app_metadata?.role !== 'admin') {
      return { status: 'error', message: 'unauthorized' }
    }

    // Block QR if the client already completed registration.
    if (await isClientFullyRegistered(e164)) {
      return { status: 'already_registered' }
    }

    const supabase = createServiceClient()

    const { data: usersData, error: listUsersError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (listUsersError || !usersData?.users) {
      console.error('[qr] listUsers error:', listUsersError)
      return { status: 'error', message: 'generic_error' }
    }

    const existingAuthUser = usersData.users.find(u => u.email === phoneToAuthEmail(e164))
    if (existingAuthUser) {
      // Auth user exists and not fully registered — QR is valid.
      return { status: 'ok' }
    }

    const { data: createdAuth, error: createUserError } = await supabase.auth.admin.createUser({
      email: phoneToAuthEmail(e164),
      password: e164,
      email_confirm: true,
      app_metadata: { role: 'client' },
    })

    if (createUserError || !createdAuth.user) {
      console.error('[qr] createUser error:', createUserError)
      return { status: 'error', message: 'generic_error' }
    }

    // Link existing orphan client row if any
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id, user_id')
      .eq('phone', e164)
      .is('user_id', null)
      .maybeSingle()

    if (existingClient) {
      const { error: linkError } = await supabase
        .from('clients')
        .update({ user_id: createdAuth.user.id })
        .eq('id', existingClient.id)
      if (linkError) {
        console.error('[qr] failed to link existing client:', linkError)
        await supabase.auth.admin.deleteUser(createdAuth.user.id)
        return { status: 'error', message: 'generic_error' }
      }
    }

    return { status: 'ok' }
  } catch (err) {
    console.error('[qr] unexpected error:', err)
    return { status: 'error', message: 'generic_error' }
  }
}
