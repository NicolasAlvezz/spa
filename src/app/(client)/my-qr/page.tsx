import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/supabase/queries/clients'
import { QrDisplay } from '@/components/spa/QrDisplay'

export default async function MyQrPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const client = await getClientByUserId(user.id)

  if (!client) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500 text-sm">
          Your account is not linked to a client profile yet. Please contact reception.
        </p>
      </div>
    )
  }

  return <QrDisplay client={client} />
}
