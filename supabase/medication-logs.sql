-- Medication activity logs for resident profiles.
-- This tracks medication events such as med box checks, refills, discontinuations,
-- new medication added, count checks, discrepancies, and storage updates.

create table if not exists public.medication_logs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  medication_record_id uuid references public.medication_records(id) on delete set null,
  created_by_auth_user_id uuid,
  log_date date not null default current_date,
  log_type text not null default 'med_box_check',
  all_current_meds_checked boolean not null default false,
  checked_medications jsonb not null default '[]'::jsonb,
  note_text text not null,
  self_administered boolean not null default true,
  follow_up_needed boolean not null default false,
  follow_up_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_medication_logs_provider_id on public.medication_logs(provider_id);
create index if not exists idx_medication_logs_resident_id on public.medication_logs(resident_id);
create index if not exists idx_medication_logs_medication_record_id on public.medication_logs(medication_record_id);
create index if not exists idx_medication_logs_created_by_auth_user_id on public.medication_logs(created_by_auth_user_id);

alter table public.medication_logs enable row level security;

drop policy if exists "Users can view medication logs for accessible providers" on public.medication_logs;
drop policy if exists "Authorized users can create medication logs" on public.medication_logs;
drop policy if exists "Authorized users can update medication logs" on public.medication_logs;

create policy "Users can view medication logs for accessible providers"
on public.medication_logs
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create medication logs"
on public.medication_logs
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update medication logs"
on public.medication_logs
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));
