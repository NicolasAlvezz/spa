import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { LanguageToggle } from '@/components/spa/LanguageToggle'
import { ClientNav } from '@/components/spa/ClientNav'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (user) {
    const supabase = createServiceClient()
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!client) {
      redirect('/onboarding')
    } else {
      const { data: healthForm } = await supabase
        .from('client_health_forms')
        .select('id')
        .eq('client_id', client.id)
        .maybeSingle()

      if (!healthForm) {
        redirect('/onboarding')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-white border-b border-gray-100 shadow-sm">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-brand-500/15">
            <span className="text-brand-600 text-xs font-bold leading-none">VM</span>
          </div>
          <p className="text-sm font-semibold text-gray-800 tracking-tight hidden sm:block">
            VM Integral Massage
          </p>
        </div>

        {/* Right: desktop nav + language */}
        <div className="flex items-center gap-3 sm:gap-4">
          <ClientNav />
          <LanguageToggle />
        </div>
      </header>

      {/* pb-16 on mobile to avoid content behind bottom nav bar */}
      <main className="flex-1 flex flex-col pb-16 sm:pb-0">
        {children}
      </main>
    </div>
  )
}
