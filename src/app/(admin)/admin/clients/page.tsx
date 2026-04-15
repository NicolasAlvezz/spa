import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getClients } from '@/lib/supabase/queries/clients'
import { ClientsTable } from '@/components/spa/ClientsTable'

export default async function ClientsPage() {
  const [clients, t] = await Promise.all([getClients(), getTranslations('clients')])

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'} registered
          </p>
        </div>

        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          {t('new_client')}
        </Link>
      </div>

      <ClientsTable clients={clients} />
    </div>
  )
}
