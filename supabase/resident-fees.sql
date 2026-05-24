-- Resident fee charges and payment tracking.

create table if not exists public.resident_fee_charges (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  house_id uuid references public.houses(id) on delete set null,
  charge_type text not null default 'program_fee',
  billing_frequency text not null default 'monthly',
  period_start date,
  period_end date,
  due_date date,
  amount numeric not null default 0,
  amount_paid numeric not null default 0,
  balance_due numeric not null default 0,
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resident_payments (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  fee_charge_id uuid references public.resident_fee_charges(id) on delete set null,
  payment_date date not null default current_date,
  amount numeric not null,
  payment_method text not null default 'cash',
  reference_number text,
  notes text,
  created_by_auth_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_resident_fee_charges_provider_id on public.resident_fee_charges(provider_id);
create index if not exists idx_resident_fee_charges_resident_id on public.resident_fee_charges(resident_id);
create index if not exists idx_resident_fee_charges_house_id on public.resident_fee_charges(house_id);
create index if not exists idx_resident_payments_provider_id on public.resident_payments(provider_id);
create index if not exists idx_resident_payments_resident_id on public.resident_payments(resident_id);
create index if not exists idx_resident_payments_fee_charge_id on public.resident_payments(fee_charge_id);

alter table public.resident_fee_charges enable row level security;
alter table public.resident_payments enable row level security;

drop policy if exists "Users can view resident fee charges for accessible providers" on public.resident_fee_charges;
drop policy if exists "Authorized users can create resident fee charges" on public.resident_fee_charges;
drop policy if exists "Authorized users can update resident fee charges" on public.resident_fee_charges;

create policy "Users can view resident fee charges for accessible providers"
on public.resident_fee_charges
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create resident fee charges"
on public.resident_fee_charges
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update resident fee charges"
on public.resident_fee_charges
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

drop policy if exists "Users can view resident payments for accessible providers" on public.resident_payments;
drop policy if exists "Authorized users can create resident payments" on public.resident_payments;

create policy "Users can view resident payments for accessible providers"
on public.resident_payments
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create resident payments"
on public.resident_payments
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));
