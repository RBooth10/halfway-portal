-- Resident maintenance requests for future resident portal submissions and provider maintenance log.

create table if not exists public.resident_maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  house_id uuid references public.houses(id) on delete set null,
  resident_id uuid references public.residents(id) on delete set null,
  submitted_by_name text,
  request_title text not null,
  request_description text not null,
  location_area text,
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'urgent')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  provider_notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resident_maintenance_requests_provider_id
on public.resident_maintenance_requests(provider_id);

create index if not exists idx_resident_maintenance_requests_house_id
on public.resident_maintenance_requests(house_id);

create index if not exists idx_resident_maintenance_requests_resident_id
on public.resident_maintenance_requests(resident_id);

create index if not exists idx_resident_maintenance_requests_status
on public.resident_maintenance_requests(status);

alter table public.resident_maintenance_requests enable row level security;

drop policy if exists "Users can view maintenance requests for accessible providers"
on public.resident_maintenance_requests;

drop policy if exists "Authorized users can create maintenance requests"
on public.resident_maintenance_requests;

drop policy if exists "Authorized users can update maintenance requests"
on public.resident_maintenance_requests;

create policy "Users can view maintenance requests for accessible providers"
on public.resident_maintenance_requests
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create maintenance requests"
on public.resident_maintenance_requests
for insert
to authenticated
with check (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can update maintenance requests"
on public.resident_maintenance_requests
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));
