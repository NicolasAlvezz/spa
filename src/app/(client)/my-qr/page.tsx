import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/supabase/queries/clients'
import {
  getClientNextAppointment,
  getClientRecentVisits,
} from '@/lib/supabase/queries/client-portal'
import { QrDisplay } from '@/components/spa/QrDisplay'

export default async function MyQrPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('myqr')
  const client = await getClientByUserId(user.id)

  if (!client) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500 text-sm max-w-xs leading-relaxed">{t('not_linked')}</p>
      </div>
    )
  }

  const [nextAppointment, recentVisits] = await Promise.all([
    getClientNextAppointment(client.id),
    getClientRecentVisits(client.id, 5),
  ])

  return (
    <QrDisplay
      client={client}
      nextAppointment={nextAppointment}
      recentVisits={recentVisits}
    />
  )
}
