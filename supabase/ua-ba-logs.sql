-- UA/BA logs for resident profiles.

create table if not exists public.ua_ba_logs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  created_by_auth_user_id uuid,
  collection_date date not null default current_date,
  test_type text not null default 'UA',
  result text not null default 'pending',
  breathalyzer_result text,
  reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ua_ba_logs_provider_id on public.ua_ba_logs(provider_id);
create index if not exists idx_ua_ba_logs_resident_id on public.ua_ba_logs(resident_id);
create index if not exists idx_ua_ba_logs_created_by_auth_user_id on public.ua_ba_logs(created_by_auth_user_id);

alter table public.ua_ba_logs enable row level security;

drop policy if exists "Users can view UA BA logs for accessible providers" on public.ua_ba_logs;
drop policy if exists "Authorized users can create UA BA logs" on public.ua_ba_logs;
drop policy if exists "Authorized users can update UA BA logs" on public.ua_ba_logs;

create policy "Users can view UA BA logs for accessible providers"
on public.ua_ba_logs
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create UA BA logs"
on public.ua_ba_logs
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update UA BA logs"
on public.ua_ba_logs
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));
