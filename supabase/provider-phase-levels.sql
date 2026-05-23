-- Provider-defined phase levels.
-- These phases will later be managed from the provider profile/settings screen.

create table if not exists public.provider_phase_levels (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  phase_name text not null,
  phase_order integer not null default 1,
  minimum_days integer,
  curfew_description text,
  requirements_description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, phase_name)
);

alter table public.residents
add column if not exists current_phase_id uuid references public.provider_phase_levels(id) on delete set null,
add column if not exists current_phase text;

create index if not exists idx_provider_phase_levels_provider_id on public.provider_phase_levels(provider_id);
create index if not exists idx_provider_phase_levels_active on public.provider_phase_levels(provider_id, is_active);
create index if not exists idx_residents_current_phase_id on public.residents(current_phase_id);

alter table public.provider_phase_levels enable row level security;

drop policy if exists "Users can view provider phase levels for accessible providers" on public.provider_phase_levels;
drop policy if exists "Authorized users can create provider phase levels" on public.provider_phase_levels;
drop policy if exists "Authorized users can update provider phase levels" on public.provider_phase_levels;

create policy "Users can view provider phase levels for accessible providers"
on public.provider_phase_levels
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create provider phase levels"
on public.provider_phase_levels
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update provider phase levels"
on public.provider_phase_levels
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

-- Seed default phases for existing providers only if they do not already have phases.
insert into public.provider_phase_levels (
  provider_id,
  phase_name,
  phase_order,
  minimum_days,
  curfew_description,
  requirements_description
)
select
  p.id,
  phase.phase_name,
  phase.phase_order,
  phase.minimum_days,
  phase.curfew_description,
  phase.requirements_description
from public.providers p
cross join (
  values
    ('Phase 1', 1, 30, '10:00 PM curfew', 'Initial stabilization, house rules orientation, sponsor/home group planning.'),
    ('Phase 2', 2, 31, '11:00 PM Sunday-Thursday and 12:00 AM Friday-Saturday curfew', 'Continued meeting attendance, recovery support building, employment/education/volunteer progress.'),
    ('Phase 3', 3, 61, '12:00 AM curfew', 'Increased independence, ongoing recovery plan progress, leadership and accountability.'),
    ('Phase 4', 4, null, 'Provider-defined curfew', 'Provider-defined advanced phase requirements.')
) as phase(phase_name, phase_order, minimum_days, curfew_description, requirements_description)
where not exists (
  select 1
  from public.provider_phase_levels existing
  where existing.provider_id = p.id
);
