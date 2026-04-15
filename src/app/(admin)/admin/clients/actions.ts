'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { addMonths, format } from 'date-fns'

export type CreateClientState = { error: string } | undefined

export async function createClientAction(
  _prev: CreateClientState,
  formData: FormData
): Promise<CreateClientState> {
  // Verify the caller is an authenticated admin before touching the DB
  const authClient = await createClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user || user.app_metadata?.role !== 'admin') {
    console.error('[createClientAction] unauthorized:', authError?.message, 'role:', user?.app_metadata?.role)
    return { error: 'save_error' }
  }

  // Use service client so server actions are not affected by RLS configuration
  const supabase = createServiceClient()

  // ── Personal fields ──────────────────────────────────────────────────────
  const first_name = (formData.get('first_name') as string).trim()
  const last_name = (formData.get('last_name') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const address = (formData.get('address') as string).trim()
  const email = (formData.get('email') as string | null)?.trim() || null
  const how_did_you_hear = (formData.get('how_did_you_hear') as string | null) || null
  const first_visit_date = (formData.get('first_visit_date') as string | null) || null
  const is_healthcare_worker = formData.get('is_healthcare_worker') === 'on'
  const work_id_verified = formData.get('work_id_verified') === 'on'
  const preferred_language = (formData.get('preferred_language') as 'en' | 'es') || 'en'
  const notes = (formData.get('notes') as string | null)?.trim() || null

  // ── Membership fields (optional) ─────────────────────────────────────────
  const plan_id = (formData.get('plan_id') as string | null) || null
  const payment_method = (formData.get('payment_method') as string | null) || null
  const payment_amount = parseFloat(formData.get('payment_amount') as string) || 0

  // ── Insert client ─────────────────────────────────────────────────────────
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      first_name,
      last_name,
      phone,
      address,
      email,
      how_did_you_hear,
      first_visit_date,
      is_healthcare_worker,
      work_id_verified,
      preferred_language,
      notes,
    })
    .select('id')
    .single()

  if (clientError || !client) {
    console.error('[createClientAction] insert client failed:', clientError)
    return { error: 'save_error' }
  }

  // ── Optional: create membership + payment ─────────────────────────────────
  if (plan_id && payment_method && payment_amount > 0) {
    const startDate = first_visit_date ? new Date(first_visit_date) : new Date()
    const expiresAt = format(addMonths(startDate, 1), 'yyyy-MM-dd')

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        client_id: client.id,
        plan_id,
        started_at: format(startDate, 'yyyy-MM-dd'),
        expires_at: expiresAt,
        status: 'active',
      })
      .select('id')
      .single()

    if (membershipError || !membership) {
      console.error('[createClientAction] insert membership failed:', membershipError)
      // Client was created — redirect to detail even if membership fails
      redirect(`/admin/clients/${client.id}`)
    }

    await supabase.from('payments').insert({
      client_id: client.id,
      membership_id: membership.id,
      amount_usd: payment_amount,
      method: payment_method as 'cash' | 'debit' | 'credit',
      concept: 'monthly_membership',
    })
  }

  redirect(`/admin/clients/${client.id}`)
}
