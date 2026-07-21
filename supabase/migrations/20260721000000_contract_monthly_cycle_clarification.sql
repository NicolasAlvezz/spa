-- Clarify in the signed contract that the included monthly session renews on
-- the purchase-date anniversary (one month after signup/last payment), not on
-- the 1st of the calendar month — to prevent client confusion at check-in.

update public.membership_plans set
  contract_body_en = replace(
    contract_body_en,
    '2. PLAN DETAILS: The Basic Membership includes 1 therapeutic massage session per month at $89 USD. Unused sessions may roll over for up to 2 months.',
    '2. PLAN DETAILS: The Basic Membership includes 1 therapeutic massage session per month at $89 USD. Your monthly session renews one month after your purchase date (not on the 1st of each calendar month) — for example, if you join on the 15th, your next included session is available starting the 15th of the following month. Unused sessions may roll over for up to 2 months.'
  ),
  contract_body_es = replace(
    contract_body_es,
    '2. DETALLES DEL PLAN: La Membresía Básica incluye 1 sesión de masaje terapéutico por mes a $89 USD. Las sesiones no utilizadas pueden acumularse hasta por 2 meses.',
    '2. DETALLES DEL PLAN: La Membresía Básica incluye 1 sesión de masaje terapéutico por mes a $89 USD. Su sesión mensual se renueva un mes después de la fecha de compra (no el día 1 de cada mes calendario) — por ejemplo, si se inscribe el día 15, su próxima sesión incluida estará disponible a partir del día 15 del mes siguiente. Las sesiones no utilizadas pueden acumularse hasta por 2 meses.'
  )
where slug = 'basic';

update public.membership_plans set
  contract_body_en = replace(
    contract_body_en,
    '2. PLAN DETAILS: The Premium Membership includes 1 therapeutic massage session per month at $99 USD. Unused sessions may roll over for up to 3 months.',
    '2. PLAN DETAILS: The Premium Membership includes 1 therapeutic massage session per month at $99 USD. Your monthly session renews one month after your purchase date (not on the 1st of each calendar month) — for example, if you join on the 15th, your next included session is available starting the 15th of the following month. Unused sessions may roll over for up to 3 months.'
  ),
  contract_body_es = replace(
    contract_body_es,
    '2. DETALLES DEL PLAN: La Membresía Premium incluye 1 sesión de masaje terapéutico por mes a $99 USD. Las sesiones no utilizadas pueden acumularse hasta por 3 meses.',
    '2. DETALLES DEL PLAN: La Membresía Premium incluye 1 sesión de masaje terapéutico por mes a $99 USD. Su sesión mensual se renueva un mes después de la fecha de compra (no el día 1 de cada mes calendario) — por ejemplo, si se inscribe el día 15, su próxima sesión incluida estará disponible a partir del día 15 del mes siguiente. Las sesiones no utilizadas pueden acumularse hasta por 3 meses.'
  )
where slug = 'premium';
