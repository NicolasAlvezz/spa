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
    // User already exists in auth — check if they completed registration
    if (authError.message.toLowerCase().includes('already') || authError.status === 422) {
      const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const existing = users.find(u => u.email?.toLowerCase() === email)

      if (existing) {
        // If they already have a client record, they're fully registered
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('user_id', existing.id)
          .maybeSingle()

        if (client) {
          return { status: 'error', message: 'email_taken' }
        }

        // Not registered yet — delete stale auth user and re-invite
        await supabase.auth.admin.deleteUser(existing.id)

        const { data: fresh, error: reinviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
        })

        if (reinviteError || !fresh) {
          return { status: 'error', message: 'generic_error' }
        }

        await supabase.auth.admin.updateUserById(fresh.user.id, {
          app_metadata: { role: 'client' },
        })

        return { status: 'success', email }
      }
    }

    return { status: 'error', message: 'generic_error' }
  }

  await supabase.auth.admin.updateUserById(authData.user.id, {
    app_metadata: { role: 'client' },
  })

  return { status: 'success', email }
}
