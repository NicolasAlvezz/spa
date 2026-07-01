import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { FileText } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getClientByUserId } from '@/lib/supabase/queries/clients'
import { MembershipsClient } from './MembershipsClient'
import type { PendingContractData, MembershipHistoryItem } from './MembershipsClient'

export default async function MembershipsPage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const client = await getClientByUserId(user.id)
  if (!client) redirect('/my-qr')

  const locale: 'en' | 'es' = client.preferred_language === 'es' ? 'es' : 'en'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const now = new Date().toISOString()

  const [t, pendingRes, membershipsRes] = await Promise.all([
    getTranslations('membership_contract'),
    supabase
      .from('membership_requests')
      .select('id, terms_title, terms_body, expires_at, version, language, admin_signature_image, membership_plans!inner(name_en, name_es, price_usd, plan_type)')
      .eq('client_id', client.id)
      .eq('status', 'pending')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('memberships')
      .select('id, status, started_at, expires_at, sessions_remaining, membership_plans!inner(name_en, name_es, price_usd, plan_type)')
      .eq('client_id', client.id)
      .order('started_at', { ascending: false }),
  ])

  const pendingRequest = (pendingRes.data ?? null) as PendingContractData | null
  const memberships = (membershipsRes.data ?? []) as MembershipHistoryItem[]

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-6 gap-5">

      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-50">
          <FileText size={18} className="text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t('page_title')}</h1>
      </div>

      <MembershipsClient
        pendingRequest={pendingRequest}
        memberships={memberships}
        locale={locale}
        clientProfile={{
          first_name: client.first_name,
          last_name: client.last_name,
          phone: client.phone,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          email: (client as any).email ?? null,
          address: client.address,
        }}
      />

    </div>
  )
}
