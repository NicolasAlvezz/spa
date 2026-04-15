import { getTranslations } from 'next-intl/server'

export default async function AdminDashboardPage() {
  const t = await getTranslations('admin')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900">{t('welcome')}</h1>
      <p className="text-gray-500 mt-1">{t('dashboard_subtitle')}</p>
    </div>
  )
}
