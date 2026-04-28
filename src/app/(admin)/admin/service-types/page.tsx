import { getTranslations } from 'next-intl/server'
import { getAllServiceTypes } from '@/lib/supabase/queries/clients'
import { ServiceTypeRow } from './ServiceTypeRow'

export default async function ServiceTypesPage() {
  const [t, serviceTypes] = await Promise.all([
    getTranslations('nav'),
    getAllServiceTypes(),
  ])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('services')}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Manage available massage types. Inactive types are hidden from client booking.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden divide-y divide-gray-100">
        {serviceTypes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">
            No service types found.
          </div>
        ) : (
          serviceTypes.map((s) => (
            <ServiceTypeRow key={s.id} service={s} />
          ))
        )}
      </div>

      <p className="text-xs text-gray-300 leading-relaxed">
        To add or rename a service type, contact your developer or update via the Supabase dashboard.
      </p>
    </div>
  )
}
