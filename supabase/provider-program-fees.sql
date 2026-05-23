-- Provider-level program fee settings.

alter table public.providers
add column if not exists program_fee_model text default 'cost_per_client',
add column if not exists cost_per_client numeric,
add column if not exists split_rent_total_amount numeric,
add column if not exists split_rent_client_count integer,
add column if not exists program_fee_frequency text default 'monthly',
add column if not exists program_fee_charge_day_of_month integer,
add column if not exists program_fee_charge_day_of_week text,
add column if not exists admission_fee_amount numeric,
add column if not exists admission_fee_refundable boolean not null default false;
