import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/supabase/queries/clients'
import { ClientProfileForm } from '@/components/spa/ClientProfileForm'
import { LogoutButton } from '@/components/spa/LogoutButton'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [t, client] = await Promise.all([
    getTranslations('clientprofile'),
    getClientByUserId(user.id),
  ])

  if (!client) redirect('/my-qr')

  return (
    <div className="flex-1 flex flex-col max-w-sm mx-auto w-full px-4 py-8 gap-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50">
          <User size={18} className="text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      </div>

      {/* Client name (read-only) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Name</p>
        <p className="text-base font-semibold text-gray-900">
          {client.first_name} {client.last_name}
        </p>
      </div>

      {/* Editable form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5">
        <ClientProfileForm client={client} />
      </div>

      {/* Sign out */}
      <div className="pt-2 border-t border-gray-100 flex justify-center">
        <LogoutButton />
      </div>

    </div>
  )
}
