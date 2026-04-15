'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { LayoutDashboard, Users, ScanLine, LogOut, Loader2 } from 'lucide-react'
import { useTransition } from 'react'
import { logout } from '@/app/login/actions'
import { LanguageToggle } from '@/components/spa/LanguageToggle'

export function AdminSidebar() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(() => { logout() })
  }

  const links = [
    { href: '/admin',         label: t('dashboard'), icon: LayoutDashboard },
    { href: '/admin/clients', label: t('clients'),   icon: Users },
    { href: '/scan',          label: t('scan'),      icon: ScanLine },
  ]

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-950 flex flex-col border-r border-slate-800">

      {/* Brand */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/20 flex-shrink-0">
            <span className="text-amber-400 text-lg font-bold leading-none">V</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">VM Integral</p>
            <p className="text-slate-500 text-xs leading-tight">Massage Inc.</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          // exact match for /admin, prefix match for sub-routes
          const isActive =
            href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-slate-800 text-white border-l-2 border-amber-500 rounded-l-none pl-[10px]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-l-2 border-transparent rounded-l-none pl-[10px]',
              ].join(' ')}
            >
              <Icon size={16} className={isActive ? 'text-amber-400' : 'text-slate-500'} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-3">
        <div className="px-3">
          <LanguageToggle />
        </div>

        {/* Admin name */}
        <div className="px-3 py-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Admin</p>
          <p className="text-sm text-slate-300 font-medium">Maria Victoria</p>
        </div>

        <button
          onClick={handleLogout}
          disabled={isPending}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors disabled:opacity-50"
        >
          {isPending
            ? <Loader2 size={16} className="animate-spin" />
            : <LogOut size={16} />
          }
          {isPending ? '...' : 'Log out'}
        </button>
      </div>
    </aside>
  )
}
