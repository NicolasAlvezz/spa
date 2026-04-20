'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { QrCode, Clock, User } from 'lucide-react'

const links = [
  { href: '/my-qr',   icon: QrCode, key: 'my_qr'   },
  { href: '/visits',  icon: Clock,  key: 'visits'  },
  { href: '/profile', icon: User,   key: 'profile' },
] as const

export function ClientNav() {
  const t = useTranslations('clientnav')
  const pathname = usePathname()

  function active(href: string) {
    return pathname === href
  }

  return (
    <>
      {/* Desktop: horizontal links in header (sm+) */}
      <nav className="hidden sm:flex items-center gap-0.5">
        {links.map(({ href, key }) => (
          <Link
            key={href}
            href={href}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              active(href)
                ? 'bg-amber-50 text-amber-700'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100',
            ].join(' ')}
          >
            {t(key)}
          </Link>
        ))}
      </nav>

      {/* Mobile: bottom navigation bar (hidden sm+) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200 flex safe-area-inset-bottom">
        {links.map(({ href, icon: Icon, key }) => (
          <Link
            key={href}
            href={href}
            className={[
              'flex-1 flex flex-col items-center justify-center pt-2.5 pb-3 gap-1 text-[10px] font-semibold tracking-wide transition-colors',
              active(href)
                ? 'text-amber-600'
                : 'text-gray-400 hover:text-gray-600',
            ].join(' ')}
          >
            <Icon
              size={22}
              strokeWidth={active(href) ? 2.5 : 1.8}
              className="transition-all"
            />
            {t(key)}
          </Link>
        ))}
      </nav>
    </>
  )
}
