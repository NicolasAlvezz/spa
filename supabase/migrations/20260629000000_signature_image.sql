-- Add drawn signature image (base64 PNG) to consent and membership contract records
alter table public.consent_acceptances add column signature_image text;
alter table public.membership_requests  add column signature_image text;
