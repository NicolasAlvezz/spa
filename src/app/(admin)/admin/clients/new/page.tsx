import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { getActivePlans } from '@/lib/supabase/queries/clients'
import { ClientForm } from '@/components/spa/ClientForm'

export default async function NewClientPage() {
  const [plans, t] = await Promise.all([getActivePlans(), getTranslations('clients')])

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/clients" className="text-sm text-gray-400 hover:text-gray-600">
          ← {t('back_to_clients')}
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900">{t('new_client')}</h1>
      <ClientForm plans={plans} />
    </div>
  )
}
