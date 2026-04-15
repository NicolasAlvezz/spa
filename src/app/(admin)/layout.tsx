import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { LanguageToggle } from '@/components/spa/LanguageToggle'
import { LogoutButton } from '@/components/spa/LogoutButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('nav')

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-slate-900 flex flex-col">
        {/* Brand */}
        <div className="px-4 py-5 border-b border-slate-700">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-0.5">VM Integral</p>
          <p className="text-sm font-semibold text-white leading-tight">Massage Inc.</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          <NavLink href="/admin" label={t('dashboard')} icon="⊞" exact />
          <NavLink href="/admin/clients" label={t('clients')} icon="👥" />
          <NavLink href="/scan" label={t('scan')} icon="⬡" />
        </nav>

        {/* Bottom */}
        <div className="px-2 py-4 border-t border-slate-700 space-y-2">
          <div className="px-3">
            <LanguageToggle />
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({
  href,
  label,
  icon,
  exact = false,
}: {
  href: string
  label: string
  icon: string
  exact?: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
    >
      <span className="text-base leading-none">{icon}</span>
      {label}
    </Link>
  )
}
