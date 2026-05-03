'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard, Users, ScanLine, BarChart3, Sparkles,
  LogOut, Loader2, Menu, X,
} from 'lucide-react'
import { useState, useTransition } from 'react'
import { logout } from '@/app/login/actions'
import { LanguageToggle } from '@/components/spa/LanguageToggle'

interface Props {
  displayName: string
  displayEmail: string | null
}

export function AdminSidebar({ displayName, displayEmail }: Props) {
  const t = useTranslations('nav')
  const tAuth = useTranslations('auth')
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  function handleLogout() {
    startTransition(() => { logout() })
  }

  const links = [
    { href: '/admin',                 label: t('dashboard'), icon: LayoutDashboard },
    { href: '/admin/clients',         label: t('clients'),   icon: Users },
    { href: '/admin/stats',           label: t('stats'),     icon: BarChart3 },
    { href: '/admin/services',         label: t('services'),  icon: Sparkles },
    { href: '/scan',                  label: t('scan'),      icon: ScanLine },
  ]

  function active(href: string) {
    return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)
  }

  function linkCls(href: string) {
    return [
      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
      active(href)
        ? 'bg-slate-800 text-white border-l-2 border-brand-500 rounded-l-none pl-[10px]'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border-l-2 border-transparent rounded-l-none pl-[10px]',
    ].join(' ')
  }

  // Content shared by both desktop sidebar and mobile drawer
  const SidebarBody = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <>
      {/* Brand */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Image src="/images/logo.png" alt="VM" width={40} height={40} className="rounded-lg object-cover flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">VM Integral</p>
            <p className="text-slate-500 text-xs leading-tight">Massage Inc.</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={linkCls(href)}
          >
            <Icon size={16} className={active(href) ? 'text-brand-400' : 'text-slate-500'} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-slate-800 space-y-3">
        <div className="px-3">
          <LanguageToggle />
        </div>
        <div className="px-3 py-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Admin</p>
          <p className="text-sm text-slate-300 font-medium leading-tight">{displayName}</p>
          {displayEmail && displayEmail !== displayName && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{displayEmail}</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          disabled={isPending}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          {tAuth('logout')}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── Mobile top bar (hidden on lg+) ──────────────────────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-black border-b border-slate-800 flex items-center gap-3 px-4">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <Image src="/images/logo.png" alt="VM" width={28} height={28} className="rounded-md object-cover flex-shrink-0" />
          <p className="text-white font-semibold text-sm">VM Integral</p>
        </div>
      </header>

      {/* ── Mobile drawer backdrop ────────────────────────────────────────── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      <aside
        className={[
          'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-black flex flex-col border-r border-slate-800',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Drawer close row */}
        <div className="flex items-center justify-end px-4 pt-3 pb-1">
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>
        <SidebarBody onLinkClick={() => setOpen(false)} />
      </aside>

      {/* ── Desktop sidebar (hidden below lg) ────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-black border-r border-slate-800">
        <SidebarBody />
      </aside>
    </>
  )
}
