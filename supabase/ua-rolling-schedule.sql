-- Rolling UA schedule engine.
-- Keeps future UA schedules current when residents are added, discharged, readmitted, or phased.

alter table public.ua_randomizer_schedule
alter column run_id drop not null;

create table if not exists public.ua_randomizer_rules (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  phase_id uuid references public.provider_phase_levels(id) on delete set null,
  phase_name text,
  min_tests_per_window integer not null default 1,
  max_tests_per_window integer not null default 2,
  window_days integer not null default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint ua_randomizer_rules_valid_counts check (
    min_tests_per_window >= 0
    and max_tests_per_window >= 1
    and min_tests_per_window <= max_tests_per_window
    and window_days >= 1
  )
);

create index if not exists idx_ua_randomizer_rules_provider_id
on public.ua_randomizer_rules(provider_id);

create index if not exists idx_ua_randomizer_rules_phase_id
on public.ua_randomizer_rules(phase_id);

create unique index if not exists idx_unique_scheduled_ua_by_resident_date
on public.ua_randomizer_schedule(resident_id, scheduled_date)
where status = 'scheduled';

create or replace function public.ensure_resident_rolling_ua_schedule(
  p_resident_id uuid,
  p_window_days integer default null,
  p_min_tests integer default null,
  p_max_tests integer default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  resident_record public.residents%rowtype;
  selected_rule record;
  effective_window_days integer;
  effective_min_tests integer;
  effective_max_tests integer;
  target_count integer;
  existing_count integer;
  missing_count integer;
  generated_count integer := 0;
  attempt_count integer := 0;
  max_attempts integer := 0;
  random_scheduled_date date;
  inserted_rows integer := 0;
  window_start date := current_date;
  window_end date;
begin
  select *
  into resident_record
  from public.residents
  where id = p_resident_id;

  if not found then
    return 0;
  end if;

  if coalesce(resident_record.resident_status, '') <> 'active' then
    update public.ua_randomizer_schedule
    set
      status = 'cancelled',
      reason = coalesce(reason || ' ', '') || 'Auto-cancelled because resident is no longer active.'
    where resident_id = resident_record.id
      and status = 'scheduled'
      and scheduled_date >= current_date;

    return 0;
  end if;

  select *
  into selected_rule
  from public.ua_randomizer_rules rule
  where rule.provider_id = resident_record.provider_id
    and rule.is_active = true
    and (
      (rule.phase_id is not null and rule.phase_id = resident_record.current_phase_id)
      or (
        rule.phase_id is null
        and rule.phase_name is not null
        and lower(rule.phase_name) = lower(coalesce(resident_record.current_phase, ''))
      )
      or (rule.phase_id is null and rule.phase_name is null)
    )
  order by
    case
      when rule.phase_id = resident_record.current_phase_id then 1
      when rule.phase_name is not null then 2
      else 3
    end
  limit 1;

  effective_window_days := coalesce(p_window_days, selected_rule.window_days, 30);
  effective_min_tests := coalesce(p_min_tests, selected_rule.min_tests_per_window, 1);
  effective_max_tests := coalesce(p_max_tests, selected_rule.max_tests_per_window, 2);

  if effective_window_days < 1 then
    effective_window_days := 30;
  end if;

  if effective_min_tests < 0 then
    effective_min_tests := 0;
  end if;

  if effective_max_tests < 1 then
    effective_max_tests := 1;
  end if;

  if effective_min_tests > effective_max_tests then
    effective_min_tests := effective_max_tests;
  end if;

  window_end := window_start + (effective_window_days - 1);

  target_count := effective_min_tests + floor(random() * (effective_max_tests - effective_min_tests + 1))::integer;

  with ranked_schedule as (
    select
      id,
      row_number() over (order by scheduled_date asc, created_at asc) as row_number
    from public.ua_randomizer_schedule
    where resident_id = resident_record.id
      and status = 'scheduled'
      and scheduled_date between window_start and window_end
  )
  update public.ua_randomizer_schedule schedule
  set
    status = 'cancelled',
    reason = coalesce(schedule.reason || ' ', '') || 'Auto-cancelled because resident UA frequency changed.'
  from ranked_schedule ranked
  where schedule.id = ranked.id
    and ranked.row_number > target_count;

  select count(*)
  into existing_count
  from public.ua_randomizer_schedule
  where resident_id = resident_record.id
    and status = 'scheduled'
    and scheduled_date between window_start and window_end;

  missing_count := greatest(target_count - existing_count, 0);
  max_attempts := greatest(missing_count * 25, 25);

  while generated_count < missing_count and attempt_count < max_attempts loop
    attempt_count := attempt_count + 1;
    random_scheduled_date := window_start + floor(random() * effective_window_days)::integer;

    insert into public.ua_randomizer_schedule (
      provider_id,
      run_id,
      resident_id,
      house_id,
      scheduled_date,
      status,
      reason
    )
    values (
      resident_record.provider_id,
      null,
      resident_record.id,
      resident_record.house_id,
      random_scheduled_date,
      'scheduled',
      'Rolling UA schedule auto-generated. Phase: ' || coalesce(resident_record.current_phase, 'not selected') || '.'
    )
    on conflict (resident_id, scheduled_date) where status = 'scheduled'
    do nothing;

    get diagnostics inserted_rows = row_count;

    if inserted_rows > 0 then
      generated_count := generated_count + 1;
    end if;
  end loop;

  return generated_count;
end;
$$;

create or replace function public.ensure_provider_rolling_ua_schedule(
  p_provider_id uuid,
  p_window_days integer default null,
  p_min_tests integer default null,
  p_max_tests integer default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  resident_record record;
  total_generated integer := 0;
begin
  for resident_record in
    select id
    from public.residents
    where provider_id = p_provider_id
      and resident_status = 'active'
  loop
    total_generated := total_generated + public.ensure_resident_rolling_ua_schedule(
      resident_record.id,
      p_window_days,
      p_min_tests,
      p_max_tests
    );
  end loop;

  update public.ua_randomizer_schedule schedule
  set
    status = 'cancelled',
    reason = coalesce(schedule.reason || ' ', '') || 'Auto-cancelled because resident is not active.'
  where schedule.provider_id = p_provider_id
    and schedule.status = 'scheduled'
    and schedule.scheduled_date >= current_date
    and not exists (
      select 1
      from public.residents resident
      where resident.id = schedule.resident_id
        and resident.resident_status = 'active'
    );

  return total_generated;
end;
$$;

create or replace function public.sync_resident_rolling_ua_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_resident_rolling_ua_schedule(new.id);
  return new;
end;
$$;

drop trigger if exists residents_sync_rolling_ua_schedule on public.residents;

create trigger residents_sync_rolling_ua_schedule
after insert or update of resident_status, admission_date, current_phase_id, current_phase, house_id
on public.residents
for each row
execute function public.sync_resident_rolling_ua_schedule();

-- Allow authenticated provider users to gently ensure rolling UA coverage.
grant execute on function public.ensure_resident_rolling_ua_schedule(uuid, integer, integer, integer) to authenticated;
grant execute on function public.ensure_provider_rolling_ua_schedule(uuid, integer, integer, integer) to authenticated;
