-- Provider-level fillable reports/logs.
-- Reports can apply to all active houses or one selected house.
-- Each house can later show due status and report history based on reports that apply to that house.

create table if not exists public.provider_house_reports (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  report_type text not null,
  report_date date not null default current_date,
  applies_to_scope text not null default 'single_house',
  house_id uuid references public.houses(id) on delete set null,
  completed_by text,
  report_data jsonb not null default '{}'::jsonb,
  follow_up_needed boolean not null default false,
  follow_up_notes text,
  created_by_auth_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_house_reports_type_check check (
    report_type in (
      'annual_fire_drill',
      'weekly_house_meeting_minutes',
      'monthly_staff_meeting_minutes',
      'monthly_self_safety_assessment'
    )
  ),
  constraint provider_house_reports_scope_check check (
    applies_to_scope in ('all_houses', 'single_house')
  ),
  constraint provider_house_reports_house_required_check check (
    applies_to_scope = 'all_houses'
    or house_id is not null
  )
);

create index if not exists idx_provider_house_reports_provider_id
  on public.provider_house_reports(provider_id);

create index if not exists idx_provider_house_reports_house_id
  on public.provider_house_reports(house_id);

create index if not exists idx_provider_house_reports_report_type
  on public.provider_house_reports(report_type);

create index if not exists idx_provider_house_reports_report_date
  on public.provider_house_reports(report_date);

alter table public.provider_house_reports enable row level security;

drop policy if exists "Users can view provider house reports for accessible providers" on public.provider_house_reports;
drop policy if exists "Authorized users can create provider house reports" on public.provider_house_reports;
drop policy if exists "Authorized users can update provider house reports" on public.provider_house_reports;
drop policy if exists "Authorized users can delete provider house reports" on public.provider_house_reports;

create policy "Users can view provider house reports for accessible providers"
on public.provider_house_reports
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create provider house reports"
on public.provider_house_reports
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update provider house reports"
on public.provider_house_reports
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can delete provider house reports"
on public.provider_house_reports
for delete
to authenticated
using (public.current_user_can_manage_house_records(provider_id));
