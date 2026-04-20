'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/supabase/queries/clients'
import { updateClientProfile } from '@/lib/supabase/queries/client-portal'

export async function updateProfileAction(
  _prev: string | null,
  formData: FormData
): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'error'

  const client = await getClientByUserId(user.id)
  if (!client) return 'error'

  const phone = (formData.get('phone') as string | null)?.trim() ?? ''
  const email = (formData.get('email') as string | null)?.trim() || null
  const preferredLanguage = (formData.get('preferred_language') as string | null) as 'en' | 'es' | null

  if (!phone) return 'phone_required'

  const lang: 'en' | 'es' = preferredLanguage === 'es' ? 'es' : 'en'

  const { error } = await updateClientProfile(client.id, {
    phone,
    email,
    preferred_language: lang,
  })

  if (error) return 'error'

  revalidatePath('/profile')
  return null  // null = success
}
