-- Multi-house targeting for provider-level reports/logs.
-- One provider_house_report can apply to one, several, or all active houses.

alter table public.provider_house_reports
  drop constraint if exists provider_house_reports_scope_check;

alter table public.provider_house_reports
  drop constraint if exists provider_house_reports_house_required_check;

alter table public.provider_house_reports
  add constraint provider_house_reports_scope_check
  check (applies_to_scope in ('all_houses', 'single_house', 'selected_houses'));

create table if not exists public.provider_house_report_houses (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  report_id uuid not null references public.provider_house_reports(id) on delete cascade,
  house_id uuid not null references public.houses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(report_id, house_id)
);

create index if not exists idx_provider_house_report_houses_provider_id
  on public.provider_house_report_houses(provider_id);

create index if not exists idx_provider_house_report_houses_report_id
  on public.provider_house_report_houses(report_id);

create index if not exists idx_provider_house_report_houses_house_id
  on public.provider_house_report_houses(house_id);

alter table public.provider_house_report_houses enable row level security;

drop policy if exists "Users can view provider report houses for accessible providers" on public.provider_house_report_houses;
drop policy if exists "Authorized users can create provider report houses" on public.provider_house_report_houses;
drop policy if exists "Authorized users can update provider report houses" on public.provider_house_report_houses;
drop policy if exists "Authorized users can delete provider report houses" on public.provider_house_report_houses;

create policy "Users can view provider report houses for accessible providers"
on public.provider_house_report_houses
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create provider report houses"
on public.provider_house_report_houses
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update provider report houses"
on public.provider_house_report_houses
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can delete provider report houses"
on public.provider_house_report_houses
for delete
to authenticated
using (public.current_user_can_manage_house_records(provider_id));
