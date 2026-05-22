import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingForm } from './OnboardingForm'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/setup')

  const { data: client } = await supabase
    .from('clients')
    .select('first_name, last_name, phone, address, client_health_forms(id)')
    .eq('user_id', user.id)
    .maybeSingle()

  // Already completed onboarding → go straight to QR
  const hasHealthForm = Array.isArray(client?.client_health_forms)
    ? client.client_health_forms.length > 0
    : !!client?.client_health_forms

  if (client && hasHealthForm) redirect('/my-qr')

  return (
    <OnboardingForm
      initialFirstName={client?.first_name ?? ''}
      initialLastName={client?.last_name ?? ''}
      initialPhone={client?.phone ?? ''}
    />
  )
}
