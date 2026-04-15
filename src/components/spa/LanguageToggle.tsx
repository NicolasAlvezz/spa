'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

export function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()

  function setLocale(next: 'en' | 'es') {
    document.cookie = `locale=${next}; path=/; max-age=31536000; SameSite=Lax`
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1 text-sm font-medium">
      <button
        onClick={() => setLocale('en')}
        className={locale === 'en' ? 'text-amber-600 font-bold' : 'text-gray-400 hover:text-gray-600'}
      >
        EN
      </button>
      <span className="text-gray-300">|</span>
      <button
        onClick={() => setLocale('es')}
        className={locale === 'es' ? 'text-amber-600 font-bold' : 'text-gray-400 hover:text-gray-600'}
      >
        ES
      </button>
    </div>
  )
}
