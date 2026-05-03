'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export type LinkAuthState =
  | { status: 'success'; email: string }
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

  const email = (formData.get('email') as string).trim().toLowerCase()

  if (!email) {
    return { status: 'error', message: 'fill_all_fields' }
  }

  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single()

  if (client?.user_id) {
    return { status: 'error', message: 'already_linked' }
  }

  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { status: 'error', message: 'email_taken' }
    }
    return { status: 'error', message: 'generic_error' }
  }

  // Set role in app_metadata (inviteUserByEmail only accepts user_metadata)
  const { error: roleError } = await supabase.auth.admin.updateUserById(authData.user.id, {
    app_metadata: { role: 'client' },
  })

  if (roleError) {
    console.error('[linkClientToAuth] failed to set role:', roleError)
    await supabase.auth.admin.deleteUser(authData.user.id)
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

  return { status: 'success', email }
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

  // Clear DB link first so the user is functionally unlinked even if auth deletion fails
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
