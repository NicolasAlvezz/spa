'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function adminLogin(formData: FormData): Promise<{ error: string } | never> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'error_invalid' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return { error: 'error_invalid' }
  }

  if (data.user.app_metadata?.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'error_invalid' }
  }

  redirect('/admin')
}
