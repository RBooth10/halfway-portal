-- Resident fee lifecycle fix.
-- Program fees generate only for active residents with an active admission episode.
-- Admission fees generate only when the active admission episode has charge_admission_fee = true.

create or replace function public.ensure_current_resident_fees(p_resident_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resident_record public.residents%rowtype;
  provider_record public.providers%rowtype;
  active_episode public.resident_admission_episodes%rowtype;
  full_fee_amount numeric := 0;
  charge_amount numeric := 0;
  period_start_date date := current_date;
  period_end_date date := current_date;
  charge_period_start date := current_date;
  due_date_value date := current_date;
  monthly_day integer;
  last_day_of_month date;
  full_period_days integer := 1;
  charge_days integer := 1;
  existing_program_fee_count integer := 0;
  should_prorate boolean := false;
  inserted_count integer := 0;
  selected_day_offset integer;
  charge_note text := 'Auto-generated from provider program fee settings.';
begin
  select *
  into resident_record
  from public.residents
  where id = p_resident_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Resident not found.');
  end if;

  if not public.current_user_has_provider_access(resident_record.provider_id) then
    return jsonb_build_object('ok', false, 'message', 'Not authorized for this provider.');
  end if;

  if coalesce(resident_record.resident_status, '') <> 'active' then
    return jsonb_build_object(
      'ok', true,
      'message', 'Resident is not active. No fee charges generated.',
      'resident_status', resident_record.resident_status
    );
  end if;

  select *
  into active_episode
  from public.resident_admission_episodes
  where resident_id = resident_record.id
    and status = 'active'
  order by admission_date desc, created_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', true,
      'message', 'Resident has no active admission episode. No fee charges generated.'
    );
  end if;

  select *
  into provider_record
  from public.providers
  where id = resident_record.provider_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Provider not found.');
  end if;

  if provider_record.program_fee_model = 'split_rent' then
    if coalesce(provider_record.split_rent_client_count, 0) > 0 then
      full_fee_amount := coalesce(provider_record.split_rent_total_amount, 0) / provider_record.split_rent_client_count;
    else
      full_fee_amount := 0;
    end if;
  else
    full_fee_amount := coalesce(provider_record.cost_per_client, 0);
  end if;

  if provider_record.program_fee_frequency = 'monthly' then
    period_start_date := date_trunc('month', current_date)::date;
    period_end_date := (date_trunc('month', current_date)::date + interval '1 month - 1 day')::date;
    last_day_of_month := period_end_date;

    monthly_day := least(
      greatest(coalesce(provider_record.program_fee_charge_day_of_month, extract(day from current_date)::integer), 1),
      extract(day from last_day_of_month)::integer
    );

    due_date_value := period_start_date + (monthly_day - 1);

  elsif provider_record.program_fee_frequency = 'weekly' then
    period_start_date := date_trunc('week', current_date)::date;
    period_end_date := period_start_date + 6;

    selected_day_offset := case provider_record.program_fee_charge_day_of_week
      when 'Monday' then 0
      when 'Tuesday' then 1
      when 'Wednesday' then 2
      when 'Thursday' then 3
      when 'Friday' then 4
      when 'Saturday' then 5
      when 'Sunday' then 6
      else extract(isodow from current_date)::integer - 1
    end;

    due_date_value := period_start_date + selected_day_offset;

  elsif provider_record.program_fee_frequency = 'biweekly' then
    period_start_date := date_trunc('week', current_date)::date;
    period_end_date := period_start_date + 13;

    selected_day_offset := case provider_record.program_fee_charge_day_of_week
      when 'Monday' then 0
      when 'Tuesday' then 1
      when 'Wednesday' then 2
      when 'Thursday' then 3
      when 'Friday' then 4
      when 'Saturday' then 5
      when 'Sunday' then 6
      else extract(isodow from current_date)::integer - 1
    end;

    due_date_value := period_start_date + selected_day_offset;

  else
    period_start_date := current_date;
    period_end_date := current_date;
    due_date_value := current_date;
  end if;

  select count(*)
  into existing_program_fee_count
  from public.resident_fee_charges existing
  where existing.resident_id = resident_record.id
    and existing.charge_type = 'program_fee';

  should_prorate :=
    coalesce(provider_record.prorate_first_period, true)
    and existing_program_fee_count = 0
    and active_episode.admission_date is not null
    and active_episode.admission_date > period_start_date
    and active_episode.admission_date <= period_end_date
    and provider_record.program_fee_frequency in ('monthly', 'weekly', 'biweekly');

  charge_period_start := case
    when should_prorate then active_episode.admission_date
    else period_start_date
  end;

  full_period_days := greatest((period_end_date - period_start_date) + 1, 1);
  charge_days := greatest((period_end_date - charge_period_start) + 1, 1);

  if should_prorate then
    charge_amount := round((full_fee_amount / full_period_days) * charge_days, 2);
    charge_note := 'Prorated first program fee from admission date through the end of the first billing period.';
    due_date_value := active_episode.admission_date;
  else
    charge_amount := round(full_fee_amount, 2);
  end if;

  if charge_amount > 0 then
    insert into public.resident_fee_charges (
      provider_id,
      resident_id,
      house_id,
      resident_admission_episode_id,
      charge_type,
      billing_frequency,
      period_start,
      period_end,
      due_date,
      amount,
      amount_paid,
      balance_due,
      status,
      notes
    )
    select
      resident_record.provider_id,
      resident_record.id,
      resident_record.house_id,
      active_episode.id,
      'program_fee',
      coalesce(provider_record.program_fee_frequency, 'monthly'),
      charge_period_start,
      period_end_date,
      due_date_value,
      charge_amount,
      0,
      charge_amount,
      'open',
      charge_note
    where not exists (
      select 1
      from public.resident_fee_charges existing
      where existing.resident_id = resident_record.id
        and existing.charge_type = 'program_fee'
        and existing.period_start = charge_period_start
        and existing.period_end = period_end_date
    )
    on conflict do nothing;

    get diagnostics inserted_count = row_count;
  end if;

  if coalesce(provider_record.admission_fee_amount, 0) > 0
    and active_episode.charge_admission_fee = true
  then
    insert into public.resident_fee_charges (
      provider_id,
      resident_id,
      house_id,
      resident_admission_episode_id,
      charge_type,
      billing_frequency,
      due_date,
      amount,
      amount_paid,
      balance_due,
      status,
      notes
    )
    select
      resident_record.provider_id,
      resident_record.id,
      resident_record.house_id,
      active_episode.id,
      'admission_fee',
      'one_time',
      active_episode.admission_date,
      provider_record.admission_fee_amount,
      0,
      provider_record.admission_fee_amount,
      'open',
      case
        when provider_record.admission_fee_refundable then 'One-time refundable admission fee for this admission episode.'
        else 'One-time non-refundable admission fee for this admission episode.'
      end
    where not exists (
      select 1
      from public.resident_fee_charges existing
      where existing.resident_admission_episode_id = active_episode.id
        and existing.charge_type = 'admission_fee'
    )
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', 'Resident fee charges checked.',
    'inserted_count', inserted_count,
    'prorated', should_prorate,
    'active_episode_id', active_episode.id,
    'episode_charges_admission_fee', active_episode.charge_admission_fee
  );
end;
$$;

grant execute on function public.ensure_current_resident_fees(uuid) to authenticated;
