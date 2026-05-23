-- Medication / MAT-MAR records for resident profiles.

create table if not exists public.medication_records (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  created_by_auth_user_id uuid,
  medication_name text not null,
  medication_type text not null default 'prescription',
  dosage text,
  prescribing_provider text,
  pharmacy text,
  start_date date,
  end_date date,
  status text not null default 'active',
  mat_mar_related boolean not null default false,
  self_administered boolean not null default true,
  storage_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_medication_records_provider_id on public.medication_records(provider_id);
create index if not exists idx_medication_records_resident_id on public.medication_records(resident_id);
create index if not exists idx_medication_records_created_by_auth_user_id on public.medication_records(created_by_auth_user_id);

alter table public.medication_records enable row level security;

drop policy if exists "Users can view medication records for accessible providers" on public.medication_records;
drop policy if exists "Authorized users can create medication records" on public.medication_records;
drop policy if exists "Authorized users can update medication records" on public.medication_records;

create policy "Users can view medication records for accessible providers"
on public.medication_records
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create medication records"
on public.medication_records
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update medication records"
on public.medication_records
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));
