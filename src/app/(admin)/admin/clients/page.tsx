import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getClients } from '@/lib/supabase/queries/clients'
import { ClientsTable } from '@/components/spa/ClientsTable'
import { Button } from '@/components/ui/button'

export default async function ClientsPage() {
  const [clients, t] = await Promise.all([getClients(), getTranslations('clients')])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
        <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600 text-white h-9 px-4">
          <Link href="/admin/clients/new">+ {t('new_client')}</Link>
        </Button>
      </div>

      <ClientsTable clients={clients} />
    </div>
  )
}
