import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getClients } from '@/lib/supabase/queries/clients'
import { ClientsTable } from '@/components/spa/ClientsTable'

export default async function ClientsPage() {
  const [clients, t] = await Promise.all([getClients(), getTranslations('clients')])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl pb-24 sm:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'} registered
          </p>
        </div>

        {/* Desktop: inline button */}
        <Link
          href="/admin/clients/new"
          className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          {t('new_client')}
        </Link>
      </div>

      <ClientsTable clients={clients} />

      {/* Mobile: fixed bottom button */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-20 p-4 bg-white border-t border-gray-200 shadow-lg">
        <Link
          href="/admin/clients/new"
          className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          {t('new_client')}
        </Link>
      </div>
    </div>
  )
}
