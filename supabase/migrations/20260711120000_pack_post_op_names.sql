-- Packs are exclusively for post-operative massages (60 min), not 30-min sessions.
update public.membership_plans set
  name_en = 'Session Pack – 5 Post-Op Sessions',
  name_es = 'Pack de 5 sesiones post-operatorias'
where slug in ('sesion_pack_5_30_minute', 'session_pack_5_sessions');

update public.membership_plans set
  name_en = 'Session Pack – 10 Post-Op Sessions',
  name_es = 'Pack de 10 sesiones post-operatorias'
where slug = 'session_pack_10_sessions';
