-- Preserve prior discharge information inside the new readmission admission episode notes.
-- This keeps the prior DC reason/date/notes visible in the Admission Notes section after readmission.

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
  prior_discharge_summary text;
  clean_readmission_notes text := nullif(trim(coalesce(p_notes, '')), '');
  combined_admission_notes text;
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

  prior_discharge_summary := concat_ws(
    E'\n',
    'Prior discharge information preserved at readmission:',
    'Prior discharge date: ' || coalesce(resident_record.discharge_date::text, 'Not entered'),
    'Prior discharge reason: ' || coalesce(nullif(trim(coalesce(resident_record.discharge_reason, '')), ''), 'Not entered'),
    case
      when nullif(trim(coalesce(resident_record.discharge_notes, '')), '') is not null
      then 'Prior discharge notes: ' || trim(resident_record.discharge_notes)
      else 'Prior discharge notes: Not entered'
    end
  );

  combined_admission_notes := concat_ws(
    E'\n\n',
    prior_discharge_summary,
    case
      when clean_readmission_notes is not null
      then 'Readmission notes: ' || clean_readmission_notes
      else null
    end
  );

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
    combined_admission_notes
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
