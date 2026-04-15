'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { logout } from '@/app/login/actions'

export function LogoutButton() {
  const t = useTranslations('auth')
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(() => {
      logout()
    })
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50"
    >
      {isPending ? '...' : t('logout')}
    </button>
  )
}
