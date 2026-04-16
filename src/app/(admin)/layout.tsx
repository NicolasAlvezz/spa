import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/spa/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const displayName: string =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email ??
    'Admin'

  const displayEmail: string | null = user?.email ?? null

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar displayName={displayName} displayEmail={displayEmail} />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
