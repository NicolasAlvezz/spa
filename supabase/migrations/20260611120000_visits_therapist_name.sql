-- Add therapist name to visits (recorded at QR check-in)
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS therapist_name text;

COMMENT ON COLUMN visits.therapist_name IS 'Therapist who performed the service, selected at check-in';
