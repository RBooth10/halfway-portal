-- Optional house-level program fee overrides.
-- If these fields are null, fee generation falls back to provider-level fee settings.

alter table public.houses
  add column if not exists program_fee_model_override text,
  add column if not exists cost_per_client_override numeric,
  add column if not exists split_rent_total_amount_override numeric,
  add column if not exists split_rent_client_count_override integer,
  add column if not exists program_fee_frequency_override text,
  add column if not exists program_fee_charge_day_of_month_override integer,
  add column if not exists program_fee_charge_day_of_week_override text,
  add column if not exists prorate_first_period_override boolean;
