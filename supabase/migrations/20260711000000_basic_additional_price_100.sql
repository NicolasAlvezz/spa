-- Basic plan: raise additional massage price from $89 to $100 (monthly fee stays $89).
update public.membership_plans
set additional_price_usd = 100
where slug = 'basic';

-- Keep stored contract text in sync for new signatures.
update public.membership_plans set
  contract_body_en = replace(
    contract_body_en,
    '4. ADDITIONAL SESSIONS: Additional massage sessions beyond the monthly inclusion are available at $89 USD per session.',
    '4. ADDITIONAL SESSIONS: Additional massage sessions beyond the monthly inclusion are available at $100 USD per session.'
  ),
  contract_body_es = replace(
    contract_body_es,
    '4. SESIONES ADICIONALES: Las sesiones adicionales más allá de la inclusión mensual están disponibles a $89 USD por sesión.',
    '4. SESIONES ADICIONALES: Las sesiones adicionales más allá de la inclusión mensual están disponibles a $100 USD por sesión.'
  )
where slug = 'basic';
