alter table public.residents
  add column if not exists gender text,
  add column if not exists ethnicity text,
  add column if not exists sobriety_date date,
  add column if not exists drug_of_choice text,
  add column if not exists referral_resource text,
  add column if not exists prior_address text;
