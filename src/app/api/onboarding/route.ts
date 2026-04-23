import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const authClient = await createClient()
  const { data: { user }, error: authError } = await authClient.auth.getUser()

  if (!user || authError) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Prevent duplicate client records
  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'already_registered' }, { status: 409 })
  }

  const body = await req.json()

  const {
    // Personal info
    first_name,
    last_name,
    phone,
    address,
    preferred_language,
    how_did_you_hear,
    // Health form
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

  if (!first_name || !last_name || !phone || !address) {
    return NextResponse.json({ error: 'missing_personal_fields' }, { status: 400 })
  }

  if (!contract_accepted) {
    return NextResponse.json({ error: 'contract_not_accepted' }, { status: 400 })
  }

  // Create client record
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      user_id: user.id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      email: user.email ?? null,
      preferred_language: preferred_language ?? 'en',
      how_did_you_hear: how_did_you_hear || null,
    })
    .select('id')
    .single()

  if (clientError || !client) {
    console.error('[POST /api/onboarding] client insert:', clientError)
    return NextResponse.json({ error: 'failed_to_create_client' }, { status: 500 })
  }

  // Create health form record
  const { error: formError } = await supabase
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

  if (formError) {
    console.error('[POST /api/onboarding] health form insert:', formError)
    return NextResponse.json({ error: 'failed_to_save_health_form' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
