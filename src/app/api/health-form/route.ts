import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()

  if (!user || authError) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ error: 'client_not_found' }, { status: 404 })
  }

  const body = await req.json()

  const {
    date_of_birth,
    under_medical_treatment,
    medical_treatment_details,
    known_allergies,
    allergies_details,
    chronic_conditions,
    chronic_conditions_details,
    taking_medications,
    medications_details,
    is_pregnant,
    surgeries_last_12_months,
    surgery_details,
    had_post_surgical_massage_before,
    post_surgical_details,
    existing_conditions,
    other_health_concerns,
    contract_accepted,
  } = body

  if (!contract_accepted) {
    return NextResponse.json({ error: 'contract_not_accepted' }, { status: 400 })
  }

  const { error } = await supabase
    .from('client_health_forms')
    .insert({
      client_id: client.id,
      date_of_birth: date_of_birth || null,
      under_medical_treatment: !!under_medical_treatment,
      medical_treatment_details: under_medical_treatment ? (medical_treatment_details || null) : null,
      known_allergies: !!known_allergies,
      allergies_details: known_allergies ? (allergies_details || null) : null,
      chronic_conditions: !!chronic_conditions,
      chronic_conditions_details: chronic_conditions ? (chronic_conditions_details || null) : null,
      taking_medications: !!taking_medications,
      medications_details: taking_medications ? (medications_details || null) : null,
      is_pregnant: !!is_pregnant,
      surgeries_last_12_months: !!surgeries_last_12_months,
      surgery_details: surgeries_last_12_months ? (surgery_details || null) : null,
      had_post_surgical_massage_before: !!had_post_surgical_massage_before,
      post_surgical_details: had_post_surgical_massage_before ? (post_surgical_details || null) : null,
      existing_conditions: existing_conditions || null,
      other_health_concerns: other_health_concerns || null,
      contract_accepted: true,
      contract_accepted_at: new Date().toISOString(),
    })

  if (error) {
    console.error('[POST /api/health-form]', error)
    return NextResponse.json({ error: 'failed_to_save' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
