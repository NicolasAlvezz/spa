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
  await supabase.auth.admin.updateUserById(authData.user.id, {
    app_metadata: { role: 'client' },
  })

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
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('user_id')
    .eq('id', clientId)
    .single()

  if (!client?.user_id) return {}

  await supabase.from('clients').update({ user_id: null }).eq('id', clientId)
  await supabase.auth.admin.deleteUser(client.user_id)

  return {}
}
