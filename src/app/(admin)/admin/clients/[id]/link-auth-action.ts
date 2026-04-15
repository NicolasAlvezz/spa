'use server'

import { createServiceClient } from '@/lib/supabase/server'

export type LinkAuthState =
  | { status: 'success'; email: string }
  | { status: 'error'; message: string }
  | undefined

export async function linkClientToAuth(
  clientId: string,
  _prev: LinkAuthState,
  formData: FormData
): Promise<LinkAuthState> {
  const email = (formData.get('email') as string).trim().toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { status: 'error', message: 'fill_all_fields' }
  }
  if (password.length < 6) {
    return { status: 'error', message: 'password_too_short' }
  }

  const supabase = createServiceClient()

  // Check if client already has a user_id
  const { data: client } = await supabase
    .from('clients')
    .select('user_id, email')
    .eq('id', clientId)
    .single()

  if (client?.user_id) {
    return { status: 'error', message: 'already_linked' }
  }

  // Create Supabase auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: 'client' },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { status: 'error', message: 'email_taken' }
    }
    return { status: 'error', message: 'generic_error' }
  }

  // Link auth user to client row
  const { error: updateError } = await supabase
    .from('clients')
    .update({ user_id: authData.user.id })
    .eq('id', clientId)

  if (updateError) {
    // Rollback: delete the auth user we just created
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { status: 'error', message: 'generic_error' }
  }

  return { status: 'success', email }
}

export async function unlinkClientFromAuth(
  clientId: string
): Promise<{ error?: string }> {
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single()

  if (!client?.user_id) return {}

  // Remove user_id link first
  await supabase.from('clients').update({ user_id: null }).eq('id', clientId)

  // Delete auth user
  await supabase.auth.admin.deleteUser(client.user_id)

  return {}
}
