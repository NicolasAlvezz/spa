'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export type InviteNewClientState =
  | { status: 'success'; email: string }
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

  const email = (formData.get('email') as string).trim().toLowerCase()
  if (!email) {
    return { status: 'error', message: 'fill_all_fields' }
  }

  const supabase = createServiceClient()

  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return { status: 'error', message: 'email_taken' }
    }
    return { status: 'error', message: 'generic_error' }
  }

  await supabase.auth.admin.updateUserById(authData.user.id, {
    app_metadata: { role: 'client' },
  })

  return { status: 'success', email }
}
