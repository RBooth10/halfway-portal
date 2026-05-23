-- RCI assessment tracking for resident profiles.

create table if not exists public.rci_assessments (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  created_by_auth_user_id uuid,
  assessment_date date not null default current_date,
  rci_version text not null default 'RCI-36',
  rci_score numeric,
  recovery_capital_level text,
  status text not null default 'completed',
  strengths_summary text,
  needs_summary text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rci_assessments_provider_id on public.rci_assessments(provider_id);
create index if not exists idx_rci_assessments_resident_id on public.rci_assessments(resident_id);
create index if not exists idx_rci_assessments_created_by_auth_user_id on public.rci_assessments(created_by_auth_user_id);

alter table public.rci_assessments enable row level security;

drop policy if exists "Users can view RCI assessments for accessible providers" on public.rci_assessments;
drop policy if exists "Authorized users can create RCI assessments" on public.rci_assessments;
drop policy if exists "Authorized users can update RCI assessments" on public.rci_assessments;

create policy "Users can view RCI assessments for accessible providers"
on public.rci_assessments
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create RCI assessments"
on public.rci_assessments
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update RCI assessments"
on public.rci_assessments
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));
