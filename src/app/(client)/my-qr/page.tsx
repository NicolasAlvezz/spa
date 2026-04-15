import { getTranslations } from 'next-intl/server'

// Placeholder — implemented in step 5 (QR display)
export default async function MyQrPage() {
  const t = await getTranslations('myqr')

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <div className="w-48 h-48 bg-gray-200 rounded-xl flex items-center justify-center">
        <span className="text-gray-400 text-sm">QR</span>
      </div>
      <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
      <p className="text-sm text-gray-500 text-center max-w-xs">{t('subtitle')}</p>
    </div>
  )
}
