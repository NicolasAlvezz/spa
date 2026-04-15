import { LanguageToggle } from '@/components/spa/LanguageToggle'
import { LogoutButton } from '@/components/spa/LogoutButton'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-800">VM Integral Massage</p>
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
