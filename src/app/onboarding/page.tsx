import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingForm } from './OnboardingForm'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/setup')

  const { data: client } = await supabase
    .from('clients')
    .select('first_name, last_name, phone')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <OnboardingForm
      initialFirstName={client?.first_name ?? ''}
      initialLastName={client?.last_name ?? ''}
      initialPhone={client?.phone ?? ''}
    />
  )
}
