-- App settings table for storing configuration values that can't be set via env vars
create table if not exists app_settings (
  key   text primary key,
  value text not null
);

-- Only service role can read/write (no RLS needed, table is not exposed to anon)
alter table app_settings enable row level security;

-- No policies = only service role can access
