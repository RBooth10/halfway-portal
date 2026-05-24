-- Fee ledger generator.
-- Generates all missing resident fees from admission date through today,
-- or through discharge date for discharged episodes.

alter table public.resident_fee_charges
add column if not exists resident_admission_episode_id uuid
references public.resident_admission_episodes(id) on delete set null;

create index if not exists idx_resident_fee_charges_admission_episode_id
on public.resident_fee_charges(resident_admission_episode_id);

drop index if exists public.unique_admission_fee_per_resident;

create unique index if not exists unique_admission_fee_per_episode
on public.resident_fee_charges (resident_admission_episode_id, charge_type)
where charge_type = 'admission_fee'
  and resident_admission_episode_id is not null;

create unique index if not exists unique_program_fee_per_resident_period
on public.resident_fee_charges (resident_id, charge_type, period_start, period_end)
where charge_type = 'program_fee';

create or replace function public.ensure_current_resident_fees(p_resident_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resident_record public.residents%rowtype;
  provider_record public.providers%rowtype;
  episode_record public.resident_admission_episodes%rowtype;

  full_fee_amount numeric := 0;
  charge_amount numeric := 0;

  ledger_end_date date;
  period_cursor date;
  base_period_start date;
  base_period_end date;
  charge_period_start date;
  charge_period_end date;
  due_date_value date;

  monthly_day integer;
  last_day_of_month date;
  selected_day_offset integer := 0;

  full_period_days integer := 1;
  charge_days integer := 1;

  inserted_count integer := 0;
  total_inserted_count integer := 0;
  should_prorate_charge boolean := false;
  charge_note text;
begin
  select *
  into resident_record
  from public.residents
  where id = p_resident_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Resident not found.');
  end if;

  -- App users must have provider access.
  -- Supabase SQL Editor/admin runs may have auth.uid() as null, so allow those for migrations/backfills.
  if auth.uid() is not null
    and not public.current_user_has_provider_access(resident_record.provider_id)
  then
    return jsonb_build_object('ok', false, 'message', 'Not authorized for this provider.');
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

  selected_day_offset := case provider_record.program_fee_charge_day_of_week
    when 'Monday' then 0
    when 'Tuesday' then 1
    when 'Wednesday' then 2
    when 'Thursday' then 3
    when 'Friday' then 4
    when 'Saturday' then 5
    when 'Sunday' then 6
    else 0
  end;

  for episode_record in
    select *
    from public.resident_admission_episodes
    where resident_id = resident_record.id
      and status in ('active', 'discharged')
    order by admission_date asc, created_at asc
  loop
    if episode_record.admission_date is null then
      continue;
    end if;

    ledger_end_date := case
      when episode_record.status = 'discharged' then coalesce(episode_record.discharge_date, episode_record.admission_date)
      else current_date
    end;

    if ledger_end_date < episode_record.admission_date then
      continue;
    end if;

    -- Admission fee: initial admission charges automatically, and readmission charges when the episode says yes.
    if coalesce(provider_record.admission_fee_amount, 0) > 0
      and episode_record.charge_admission_fee = true
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
      values (
        resident_record.provider_id,
        resident_record.id,
        episode_record.house_id,
        episode_record.id,
        'admission_fee',
        'one_time',
        episode_record.admission_date,
        provider_record.admission_fee_amount,
        0,
        provider_record.admission_fee_amount,
        'open',
        case
          when provider_record.admission_fee_refundable then 'One-time refundable admission fee for this admission episode.'
          else 'One-time non-refundable admission fee for this admission episode.'
        end
      )
      on conflict do nothing;

      get diagnostics inserted_count = row_count;
      total_inserted_count := total_inserted_count + inserted_count;
    end if;

    if full_fee_amount <= 0 then
      continue;
    end if;

    if provider_record.program_fee_frequency = 'daily' then
      period_cursor := episode_record.admission_date;

      while period_cursor <= ledger_end_date loop
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
        values (
          resident_record.provider_id,
          resident_record.id,
          episode_record.house_id,
          episode_record.id,
          'program_fee',
          'daily',
          period_cursor,
          period_cursor,
          period_cursor,
          round(full_fee_amount, 2),
          0,
          round(full_fee_amount, 2),
          'open',
          'Auto-generated daily program fee from provider settings.'
        )
        on conflict do nothing;

        get diagnostics inserted_count = row_count;
        total_inserted_count := total_inserted_count + inserted_count;

        period_cursor := period_cursor + 1;
      end loop;

    elsif provider_record.program_fee_frequency = 'monthly' then
      period_cursor := date_trunc('month', episode_record.admission_date)::date;

      while period_cursor <= ledger_end_date loop
        base_period_start := period_cursor;
        base_period_end := (period_cursor + interval '1 month - 1 day')::date;
        last_day_of_month := base_period_end;

        monthly_day := least(
          greatest(coalesce(provider_record.program_fee_charge_day_of_month, extract(day from base_period_start)::integer), 1),
          extract(day from last_day_of_month)::integer
        );

        due_date_value := base_period_start + (monthly_day - 1);
        charge_period_start := greatest(base_period_start, episode_record.admission_date);

        charge_period_end := case
          when episode_record.status = 'discharged' then least(base_period_end, ledger_end_date)
          else base_period_end
        end;

        full_period_days := greatest((base_period_end - base_period_start) + 1, 1);
        charge_days := greatest((charge_period_end - charge_period_start) + 1, 1);

        should_prorate_charge :=
          (charge_period_start > base_period_start and coalesce(provider_record.prorate_first_period, true))
          or charge_period_end < base_period_end;

        if should_prorate_charge then
          charge_amount := round((full_fee_amount / full_period_days) * charge_days, 2);
          charge_note := 'Prorated monthly program fee based on admission or discharge date.';
        else
          charge_amount := round(full_fee_amount, 2);
          charge_note := 'Auto-generated monthly program fee from provider settings.';
        end if;

        if due_date_value < charge_period_start then
          due_date_value := charge_period_start;
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
          values (
            resident_record.provider_id,
            resident_record.id,
            episode_record.house_id,
            episode_record.id,
            'program_fee',
            'monthly',
            charge_period_start,
            charge_period_end,
            due_date_value,
            charge_amount,
            0,
            charge_amount,
            'open',
            charge_note
          )
          on conflict do nothing;

          get diagnostics inserted_count = row_count;
          total_inserted_count := total_inserted_count + inserted_count;
        end if;

        period_cursor := (period_cursor + interval '1 month')::date;
      end loop;

    elsif provider_record.program_fee_frequency = 'biweekly' then
      period_cursor := date_trunc('week', episode_record.admission_date)::date;

      while period_cursor <= ledger_end_date loop
        base_period_start := period_cursor;
        base_period_end := period_cursor + 13;
        due_date_value := base_period_start + selected_day_offset;
        charge_period_start := greatest(base_period_start, episode_record.admission_date);

        charge_period_end := case
          when episode_record.status = 'discharged' then least(base_period_end, ledger_end_date)
          else base_period_end
        end;

        full_period_days := 14;
        charge_days := greatest((charge_period_end - charge_period_start) + 1, 1);

        should_prorate_charge :=
          (charge_period_start > base_period_start and coalesce(provider_record.prorate_first_period, true))
          or charge_period_end < base_period_end;

        if should_prorate_charge then
          charge_amount := round((full_fee_amount / full_period_days) * charge_days, 2);
          charge_note := 'Prorated bi-weekly program fee based on admission or discharge date.';
        else
          charge_amount := round(full_fee_amount, 2);
          charge_note := 'Auto-generated bi-weekly program fee from provider settings.';
        end if;

        if due_date_value < charge_period_start then
          due_date_value := charge_period_start;
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
          values (
            resident_record.provider_id,
            resident_record.id,
            episode_record.house_id,
            episode_record.id,
            'program_fee',
            'biweekly',
            charge_period_start,
            charge_period_end,
            due_date_value,
            charge_amount,
            0,
            charge_amount,
            'open',
            charge_note
          )
          on conflict do nothing;

          get diagnostics inserted_count = row_count;
          total_inserted_count := total_inserted_count + inserted_count;
        end if;

        period_cursor := period_cursor + 14;
      end loop;

    else
      period_cursor := date_trunc('week', episode_record.admission_date)::date;

      while period_cursor <= ledger_end_date loop
        base_period_start := period_cursor;
        base_period_end := period_cursor + 6;
        due_date_value := base_period_start + selected_day_offset;
        charge_period_start := greatest(base_period_start, episode_record.admission_date);

        charge_period_end := case
          when episode_record.status = 'discharged' then least(base_period_end, ledger_end_date)
          else base_period_end
        end;

        full_period_days := 7;
        charge_days := greatest((charge_period_end - charge_period_start) + 1, 1);

        should_prorate_charge :=
          (charge_period_start > base_period_start and coalesce(provider_record.prorate_first_period, true))
          or charge_period_end < base_period_end;

        if should_prorate_charge then
          charge_amount := round((full_fee_amount / full_period_days) * charge_days, 2);
          charge_note := 'Prorated weekly program fee based on admission or discharge date.';
        else
          charge_amount := round(full_fee_amount, 2);
          charge_note := 'Auto-generated weekly program fee from provider settings.';
        end if;

        if due_date_value < charge_period_start then
          due_date_value := charge_period_start;
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
          values (
            resident_record.provider_id,
            resident_record.id,
            episode_record.house_id,
            episode_record.id,
            'program_fee',
            'weekly',
            charge_period_start,
            charge_period_end,
            due_date_value,
            charge_amount,
            0,
            charge_amount,
            'open',
            charge_note
          )
          on conflict do nothing;

          get diagnostics inserted_count = row_count;
          total_inserted_count := total_inserted_count + inserted_count;
        end if;

        period_cursor := period_cursor + 7;
      end loop;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'message', 'Resident fee ledger checked through today.',
    'inserted_count', total_inserted_count
  );
end;
$$;

grant execute on function public.ensure_current_resident_fees(uuid) to authenticated;
