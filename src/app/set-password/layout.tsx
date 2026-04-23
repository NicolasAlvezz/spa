import { LanguageToggle } from '@/components/spa/LanguageToggle'

export default function SetPasswordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-amber-500/15">
            <span className="text-amber-600 text-xs font-bold leading-none">VM</span>
          </div>
          <p className="text-sm font-semibold text-gray-800 tracking-tight">
            VM Integral Massage
          </p>
        </div>
        <LanguageToggle />
      </header>
      <main className="flex flex-col items-center justify-center px-4 py-16">
        {children}
      </main>
    </div>
  )
}
