ALTER TABLE membership_requests
  ADD COLUMN IF NOT EXISTS admin_signature_image text,
  ADD COLUMN IF NOT EXISTS admin_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_fields jsonb,
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('credit', 'debit')),
  ADD COLUMN IF NOT EXISTS card_last4 text CHECK (card_last4 ~ '^\d{4}$');

COMMENT ON COLUMN membership_requests.admin_signature_image IS 'Base64 PNG of admin signature, set when contract is created';
COMMENT ON COLUMN membership_requests.admin_signed_at IS 'Timestamp when admin signed before sending';
COMMENT ON COLUMN membership_requests.contract_fields IS 'Client-editable fields captured at client signing time: full_name, date_of_birth, phone, email, address, city_state, start_date';
COMMENT ON COLUMN membership_requests.payment_method IS 'Payment method chosen at signing: credit | debit';
COMMENT ON COLUMN membership_requests.card_last4 IS 'Last 4 digits of payment card, captured at client signing';
