import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getActivePlans } from '@/lib/supabase/queries/clients'
import { ClientForm } from '@/components/spa/ClientForm'

export default async function NewClientPage() {
  const [plans, t] = await Promise.all([getActivePlans(), getTranslations('clients')])

  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={14} />
        {t('back_to_clients')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('new_client')}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Fill in the required fields to register a new client.
        </p>
      </div>

      <ClientForm plans={plans} />
    </div>
  )
}
