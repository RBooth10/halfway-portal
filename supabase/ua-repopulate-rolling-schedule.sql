-- Repopulate rolling UA schedule for a provider.
-- Cancels only future scheduled UA items, then regenerates the current rolling window.
-- Completed, skipped, and already-cancelled UA records are not changed.

create or replace function public.repopulate_provider_rolling_ua_schedule(
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
  if auth.uid() is not null
    and not public.current_user_can_manage_house_records(p_provider_id)
  then
    raise exception 'Not authorized to repopulate UA schedule for this provider.';
  end if;

  update public.ua_randomizer_schedule
  set
    status = 'cancelled',
    reason = coalesce(reason || ' ', '') || 'Cancelled during rolling UA schedule repopulation.'
  where provider_id = p_provider_id
    and status = 'scheduled'
    and scheduled_date >= current_date;

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

  return total_generated;
end;
$$;

grant execute on function public.repopulate_provider_rolling_ua_schedule(uuid, integer, integer, integer) to authenticated;
