-- Discharge documentation requirements.
-- Discharge requires reason, emergency contact call documentation, and detailed note.

alter table public.residents
add column if not exists discharge_emergency_contact_status text,
add column if not exists discharge_emergency_contact_notes text;

alter table public.resident_admission_episodes
add column if not exists discharge_reason text,
add column if not exists discharge_emergency_contact_status text,
add column if not exists discharge_emergency_contact_notes text;

drop function if exists public.discharge_resident(uuid, date, text, text);

create or replace function public.discharge_resident(
  p_resident_id uuid,
  p_discharge_date date,
  p_discharge_reason text,
  p_discharge_notes text,
  p_emergency_contact_status text,
  p_emergency_contact_notes text
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
  clean_reason text := trim(coalesce(p_discharge_reason, ''));
  clean_notes text := trim(coalesce(p_discharge_notes, ''));
  clean_contact_status text := trim(coalesce(p_emergency_contact_status, ''));
  clean_contact_notes text := trim(coalesce(p_emergency_contact_notes, ''));
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

  if clean_reason not in ('Completion', 'Admin', 'Abandonment', 'Relapse') then
    return jsonb_build_object('ok', false, 'message', 'Select a valid discharge reason.');
  end if;

  if length(clean_notes) < 20 then
    return jsonb_build_object('ok', false, 'message', 'A detailed discharge note is required.');
  end if;

  if clean_contact_status = '' then
    return jsonb_build_object('ok', false, 'message', 'Emergency contact call status is required.');
  end if;

  if length(clean_contact_notes) < 10 then
    return jsonb_build_object('ok', false, 'message', 'Emergency contact call documentation is required.');
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
    discharge_reason = clean_reason,
    discharge_notes = clean_notes,
    discharge_emergency_contact_status = clean_contact_status,
    discharge_emergency_contact_notes = clean_contact_notes
  where id = resident_record.id;

  update public.resident_admission_episodes
  set
    status = 'discharged',
    discharge_date = effective_discharge_date,
    discharge_reason = clean_reason,
    discharge_emergency_contact_status = clean_contact_status,
    discharge_emergency_contact_notes = clean_contact_notes,
    notes = clean_notes,
    updated_at = now()
  where id = active_episode.id;

  return jsonb_build_object('ok', true, 'message', 'Resident discharged.');
end;
$$;

grant execute on function public.discharge_resident(uuid, date, text, text, text, text) to authenticated;
