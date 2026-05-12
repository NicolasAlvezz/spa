'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { toE164, phoneToAuthEmail } from '@/lib/phone'

export type LinkAuthState =
  | { status: 'success' }
  | { status: 'error'; message: string }
  | undefined

export async function linkClientToAuth(
  clientId: string,
  _prev: LinkAuthState,
  formData: FormData
): Promise<LinkAuthState> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return { status: 'error', message: 'generic_error' }
  }

  const channel = (formData.get('channel') as 'sms' | 'whatsapp') ?? 'sms'

  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('user_id, phone, first_name')
    .eq('id', clientId)
    .single()

  if (!client) {
    return { status: 'error', message: 'generic_error' }
  }

  if (client.user_id) {
    return { status: 'error', message: 'already_linked' }
  }

  if (!client.phone) {
    return { status: 'error', message: 'fill_all_fields' }
  }

  const e164 = toE164(client.phone)
  const authEmail = phoneToAuthEmail(client.phone)

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: authEmail,
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

  const { error: updateError } = await supabase
    .from('clients')
    .update({ user_id: authData.user.id })
    .eq('id', clientId)

  if (updateError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { status: 'error', message: 'generic_error' }
  }

  // Send Twilio invite
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  fetch(`${appUrl}/api/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: e164, clientName: client.first_name, channel }),
  }).catch(() => {})

  return { status: 'success' }
}

export async function unlinkClientFromAuth(
  clientId: string
): Promise<{ error?: string }> {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return { error: 'unauthorized' }
  }

  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single()

  if (!client?.user_id) return {}

  const { error: clearError } = await supabase
    .from('clients')
    .update({ user_id: null })
    .eq('id', clientId)

  if (clearError) {
    console.error('[unlinkClientFromAuth] failed to clear user_id:', clearError)
    return { error: 'failed_to_unlink' }
  }

  const { error: deleteError } = await supabase.auth.admin.deleteUser(client.user_id)
  if (deleteError) {
    console.error('[unlinkClientFromAuth] failed to delete auth user:', deleteError)
  }

  return {}
}
