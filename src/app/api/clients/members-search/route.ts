import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export interface MemberSearchResult {
  id: string
  first_name: string
  last_name: string
  plan_name_en: string
  plan_name_es: string
}

export async function GET(req: Request) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  const exclude = searchParams.get('exclude') ?? ''

  if (!q || q.length < 2) {
    return NextResponse.json([])
  }

  const supabase = createServiceClient()

  // Find clients with at least one active membership matching the name query
  const { data, error } = await supabase
    .from('clients')
    .select('id, first_name, last_name, memberships!inner(status, membership_plans(name_en, name_es))')
    .eq('memberships.status', 'active')
    .eq('is_active', true)
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    .neq('id', exclude || '00000000-0000-0000-0000-000000000000')
    .limit(8)
    .order('first_name')

  if (error) {
    console.error('[members-search]', error)
    return NextResponse.json([])
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: MemberSearchResult[] = (data ?? []).map((c: any) => {
    const plan = c.memberships?.[0]?.membership_plans
    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      plan_name_en: plan?.name_en ?? '',
      plan_name_es: plan?.name_es ?? '',
    }
  })

  return NextResponse.json(results)
}
