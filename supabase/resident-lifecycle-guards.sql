-- Resident lifecycle guardrails.
-- Protects resident admission episodes from invalid discharge/readmission states.

create unique index if not exists unique_active_admission_episode_per_resident
on public.resident_admission_episodes (resident_id)
where status = 'active';

create or replace function public.discharge_resident(
  p_resident_id uuid,
  p_discharge_date date,
  p_discharge_reason text,
  p_discharge_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resident_record public.residents%rowtype;
  active_episode public.resident_admission_episodes%rowtype;
  effective_discharge_date date := coalesce(p_discharge_date, current_date);
begin
  select *
  into resident_record
  from public.residents
  where id = p_resident_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Resident not found.');
  end if;

  if auth.uid() is not null
    and not public.current_user_can_manage_house_records(resident_record.provider_id)
  then
    return jsonb_build_object('ok', false, 'message', 'Not authorized to discharge this resident.');
  end if;

  if resident_record.resident_status <> 'active' then
    return jsonb_build_object('ok', false, 'message', 'Only active residents can be discharged.');
  end if;

  select *
  into active_episode
  from public.resident_admission_episodes
  where resident_id = resident_record.id
    and status = 'active'
  order by admission_date desc, created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Resident has no active admission episode to discharge.');
  end if;

  if effective_discharge_date < active_episode.admission_date then
    return jsonb_build_object('ok', false, 'message', 'Discharge date cannot be before the active admission date.');
  end if;

  update public.residents
  set
    resident_status = 'discharged',
    discharge_date = effective_discharge_date,
    discharge_reason = nullif(trim(coalesce(p_discharge_reason, '')), ''),
    discharge_notes = nullif(trim(coalesce(p_discharge_notes, '')), '')
  where id = resident_record.id;

  update public.resident_admission_episodes
  set
    status = 'discharged',
    discharge_date = effective_discharge_date,
    notes = coalesce(nullif(trim(coalesce(p_discharge_notes, '')), ''), notes),
    updated_at = now()
  where id = active_episode.id;

  return jsonb_build_object('ok', true, 'message', 'Resident discharged.');
end;
$$;

grant execute on function public.discharge_resident(uuid, date, text, text) to authenticated;

create or replace function public.readmit_resident(
  p_resident_id uuid,
  p_admission_date date,
  p_house_id uuid,
  p_charge_admission_fee boolean,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resident_record public.residents%rowtype;
  active_episode_count integer;
  latest_discharge_date date;
  effective_admission_date date := coalesce(p_admission_date, current_date);
  new_episode_id uuid;
begin
  select *
  into resident_record
  from public.residents
  where id = p_resident_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Resident not found.');
  end if;

  if auth.uid() is not null
    and not public.current_user_can_manage_house_records(resident_record.provider_id)
  then
    return jsonb_build_object('ok', false, 'message', 'Not authorized to readmit this resident.');
  end if;

  if resident_record.resident_status <> 'discharged' then
    return jsonb_build_object('ok', false, 'message', 'Only discharged residents can be readmitted.');
  end if;

  select count(*)
  into active_episode_count
  from public.resident_admission_episodes
  where resident_id = resident_record.id
    and status = 'active';

  if active_episode_count > 0 then
    return jsonb_build_object('ok', false, 'message', 'Resident already has an active admission episode.');
  end if;

  select max(discharge_date)
  into latest_discharge_date
  from public.resident_admission_episodes
  where resident_id = resident_record.id
    and status = 'discharged';

  if latest_discharge_date is not null and effective_admission_date < latest_discharge_date then
    return jsonb_build_object('ok', false, 'message', 'Readmission date cannot be before the most recent discharge date.');
  end if;

  update public.residents
  set
    resident_status = 'active',
    admission_date = effective_admission_date,
    last_readmission_date = effective_admission_date,
    discharge_date = null,
    discharge_reason = null,
    discharge_notes = null,
    house_id = coalesce(p_house_id, resident_record.house_id)
  where id = resident_record.id;

  insert into public.resident_admission_episodes (
    provider_id,
    resident_id,
    house_id,
    admission_date,
    status,
    charge_admission_fee,
    notes
  )
  values (
    resident_record.provider_id,
    resident_record.id,
    coalesce(p_house_id, resident_record.house_id),
    effective_admission_date,
    'active',
    coalesce(p_charge_admission_fee, false),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into new_episode_id;

  perform public.ensure_current_resident_fees(resident_record.id);

  return jsonb_build_object(
    'ok', true,
    'message', 'Resident readmitted.',
    'episode_id', new_episode_id,
    'charge_admission_fee', coalesce(p_charge_admission_fee, false)
  );
end;
$$;

grant execute on function public.readmit_resident(uuid, date, uuid, boolean, text) to authenticated;
