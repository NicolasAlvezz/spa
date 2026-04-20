import { LanguageToggle } from '@/components/spa/LanguageToggle'
import { LogoutButton } from '@/components/spa/LogoutButton'
import { ClientNav } from '@/components/spa/ClientNav'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-white border-b border-gray-100 shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/15">
            <span className="text-amber-600 text-xs font-bold leading-none">VM</span>
          </div>
          <p className="text-sm font-semibold text-gray-800 tracking-tight hidden sm:block">
            VM Integral Massage
          </p>
        </div>

        {/* Right: desktop nav + language + logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          <ClientNav />
          <LanguageToggle />
          <LogoutButton />
        </div>
      </header>

      {/* pb-16 on mobile to avoid content behind bottom nav bar */}
      <main className="flex-1 flex flex-col pb-16 sm:pb-0">
        {children}
      </main>
    </div>
  )
}
