import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getClients, getActivePlans } from '@/lib/supabase/queries/clients'
import { ClientsTable } from '@/components/spa/ClientsTable'

export default async function ClientsPage() {
  const [clients, plans, t] = await Promise.all([getClients(), getActivePlans(), getTranslations('clients')])

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl pb-24 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'} registered
          </p>
        </div>

        {/* Tablet+: inline button in header */}
        <Link
          href="/admin/clients/new"
          className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          {t('new_client')}
        </Link>
      </div>

      <ClientsTable clients={clients} plans={plans} />

      {/* Mobile: FAB — floating action button, bottom-right */}
      <Link
        href="/admin/clients/new"
        aria-label={t('new_client')}
        className="md:hidden fixed bottom-6 right-5 z-20 flex items-center justify-center w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white shadow-xl shadow-brand-900/30 transition-colors"
      >
        <UserPlus size={22} />
      </Link>
    </div>
  )
}
