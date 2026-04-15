'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { logout } from '@/app/login/actions'

export function LogoutButton() {
  const t = useTranslations('auth')
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(() => { logout() })
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
    >
      {isPending
        ? <Loader2 size={14} className="animate-spin" />
        : <LogOut size={14} />
      }
      {t('logout')}
    </button>
  )
}
