-- Add per-plan contract text columns to membership_plans.
-- Nullable — falls back to generic contract from messages/*.json when null.
alter table public.membership_plans
  add column if not exists contract_title_en text default null,
  add column if not exists contract_title_es text default null,
  add column if not exists contract_body_en  text default null,
  add column if not exists contract_body_es  text default null;

-- Populate Basic plan contract
update public.membership_plans set
  contract_title_en = 'Basic Membership Commitment Agreement',
  contract_title_es = 'Acuerdo de Compromiso de Membresía Básica',
  contract_body_en  = $$By signing this agreement, I commit to the following terms with VM Integral Massage Inc.:

1. MINIMUM COMMITMENT: I agree to a minimum commitment of 6 months of continuous Basic Membership. I understand I cannot cancel before completing these 6 months.

2. PLAN DETAILS: The Basic Membership includes 1 therapeutic massage session per month at $89 USD. Unused sessions may roll over for up to 2 months.

3. INCLUDED BENEFITS: Muscle Recovery Tools; other complementary therapies per therapist's recommendation.

4. ADDITIONAL SESSIONS: Additional massage sessions beyond the monthly inclusion are available at $89 USD per session.

5. AUTOMATIC MONTHLY CHARGE: I authorize VM Integral Massage Inc. to charge $89 USD to my selected payment method on the same date each month for the duration of my membership.

6. CANCELLATION POLICY: If I choose to cancel before completing the 6-month minimum commitment, I agree to pay a cancellation fee equal to 50% of the remaining monthly payments owed.

7. PLAN CHANGES: Any changes to plan details will be communicated with at least 30 days written notice.$$,
  contract_body_es  = $$Al firmar este acuerdo, me comprometo con los siguientes términos con VM Integral Massage Inc.:

1. COMPROMISO MÍNIMO: Acepto un compromiso mínimo de 6 meses de Membresía Básica continua. Entiendo que no puedo cancelar antes de completar estos 6 meses.

2. DETALLES DEL PLAN: La Membresía Básica incluye 1 sesión de masaje terapéutico por mes a $89 USD. Las sesiones no utilizadas pueden acumularse hasta por 2 meses.

3. BENEFICIOS INCLUIDOS: Herramientas de Recuperación Muscular; otras terapias complementarias según recomendación del terapeuta.

4. SESIONES ADICIONALES: Las sesiones adicionales más allá de la inclusión mensual están disponibles a $89 USD por sesión.

5. CARGO MENSUAL AUTOMÁTICO: Autorizo a VM Integral Massage Inc. a cobrar $89 USD a mi método de pago seleccionado en la misma fecha cada mes durante la vigencia de mi membresía.

6. POLÍTICA DE CANCELACIÓN: Si elijo cancelar antes de completar el compromiso mínimo de 6 meses, acepto pagar una tarifa de cancelación equivalente al 50% de los pagos mensuales restantes adeudados.

7. CAMBIOS EN EL PLAN: Cualquier cambio en los detalles del plan se comunicará con al menos 30 días de aviso por escrito.$$
where slug = 'basic';

-- Populate Premium plan contract
update public.membership_plans set
  contract_title_en = 'Premium Membership Commitment Agreement',
  contract_title_es = 'Acuerdo de Compromiso de Membresía Premium',
  contract_body_en  = $$By signing this agreement, I commit to the following terms with VM Integral Massage Inc.:

1. MINIMUM COMMITMENT: I agree to a minimum commitment of 6 months of continuous Premium Membership. I understand I cannot cancel before completing these 6 months.

2. PLAN DETAILS: The Premium Membership includes 1 therapeutic massage session per month at $99 USD. Unused sessions may roll over for up to 3 months.

3. INCLUDED BENEFITS: Aromatherapy; Hot Stones; Cupping Therapy (Suction Therapy); Muscle Recovery Tools; other complementary therapies per therapist's recommendation.

4. ADDITIONAL SESSIONS: Additional massage sessions beyond the monthly inclusion are available at $95 USD per session.

5. AUTOMATIC MONTHLY CHARGE: I authorize VM Integral Massage Inc. to charge $99 USD to my selected payment method on the same date each month for the duration of my membership.

6. CANCELLATION POLICY: If I choose to cancel before completing the 6-month minimum commitment, I agree to pay a cancellation fee equal to 50% of the remaining monthly payments owed.

7. PLAN CHANGES: Any changes to plan details will be communicated with at least 30 days written notice.$$,
  contract_body_es  = $$Al firmar este acuerdo, me comprometo con los siguientes términos con VM Integral Massage Inc.:

1. COMPROMISO MÍNIMO: Acepto un compromiso mínimo de 6 meses de Membresía Premium continua. Entiendo que no puedo cancelar antes de completar estos 6 meses.

2. DETALLES DEL PLAN: La Membresía Premium incluye 1 sesión de masaje terapéutico por mes a $99 USD. Las sesiones no utilizadas pueden acumularse hasta por 3 meses.

3. BENEFICIOS INCLUIDOS: Aromaterapia; Piedras Calientes; Cupping Therapy (Terapia de Ventosas); Herramientas de Recuperación Muscular; otras terapias complementarias según recomendación del terapeuta.

4. SESIONES ADICIONALES: Las sesiones adicionales más allá de la inclusión mensual están disponibles a $95 USD por sesión.

5. CARGO MENSUAL AUTOMÁTICO: Autorizo a VM Integral Massage Inc. a cobrar $99 USD a mi método de pago seleccionado en la misma fecha cada mes durante la vigencia de mi membresía.

6. POLÍTICA DE CANCELACIÓN: Si elijo cancelar antes de completar el compromiso mínimo de 6 meses, acepto pagar una tarifa de cancelación equivalente al 50% de los pagos mensuales restantes adeudados.

7. CAMBIOS EN EL PLAN: Cualquier cambio en los detalles del plan se comunicará con al menos 30 días de aviso por escrito.$$
where slug = 'premium';
