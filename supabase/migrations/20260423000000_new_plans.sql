-- New membership plans: Pack 10, Pack 5
-- Post-op individual visits ($90) are registered directly via session_type='post_op'
-- and do not require a membership plan entry.

-- Pack 10 sessions
-- Split payment: $450 now (sessions 1–4) + $350 before 5th session = $800 total
INSERT INTO membership_plans (
  name_en,
  name_es,
  price_usd,
  plan_type,
  sessions_per_month,
  total_sessions,
  rollover_max,
  allows_split_payment,
  split_first_amount,
  requires_healthcare,
  is_active
) VALUES (
  'Pack 10 Sessions',
  'Pack 10 Sesiones',
  800,
  'pack',
  0,
  10,
  0,
  true,
  450,
  false,
  true
);

-- Pack 5 sessions
-- Full payment only: $425
INSERT INTO membership_plans (
  name_en,
  name_es,
  price_usd,
  plan_type,
  sessions_per_month,
  total_sessions,
  rollover_max,
  allows_split_payment,
  split_first_amount,
  requires_healthcare,
  is_active
) VALUES (
  'Pack 5 Sessions',
  'Pack 5 Sesiones',
  425,
  'pack',
  0,
  5,
  0,
  false,
  null,
  false,
  true
);
