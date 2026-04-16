-- =============================================================================
-- VM Integral Massage Inc. — Appointments Table
-- =============================================================================

CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES service_types(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_client_id    ON appointments(client_id);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status       ON appointments(status);

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appointments: admin full access"
  ON public.appointments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "appointments: client reads own"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (client_id = public.own_client_id());
