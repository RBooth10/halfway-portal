drop function if exists public.discharge_resident(uuid, date, text, text, uuid[]);

create or replace function public.discharge_resident(
  p_resident_id uuid,
  p_discharge_date date,
  p_discharge_reason text,
  p_discharge_notes text,
  p_emergency_contact_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  resident_record public.residents%rowtype;
  active_episode public.resident_admission_episodes%rowtype;
  effective_discharge_date date := coalesce(p_discharge_date, current_date);
  clean_reason text := trim(coalesce(p_discharge_reason, ''));
  clean_notes text := trim(coalesce(p_discharge_notes, ''));
  selected_contact_count integer := 0;
  contact_snapshot jsonb := '[]'::jsonb;
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

  if coalesce(array_length(p_emergency_contact_ids, 1), 0) > 0 then
    select count(*)
    into selected_contact_count
    from public.resident_emergency_contacts c
    where c.resident_id = resident_record.id
      and c.id = any(p_emergency_contact_ids);

    if selected_contact_count <> array_length(p_emergency_contact_ids, 1) then
      return jsonb_build_object('ok', false, 'message', 'One or more selected emergency contacts do not belong to this resident.');
    end if;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'contact_name', c.contact_name,
          'contact_role', c.contact_role,
          'relationship', c.relationship,
          'phone', c.phone,
          'email', c.email,
          'is_primary', c.is_primary
        )
        order by c.is_primary desc, c.contact_name
      ),
      '[]'::jsonb
    )
    into contact_snapshot
    from public.resident_emergency_contacts c
    where c.resident_id = resident_record.id
      and c.id = any(p_emergency_contact_ids);
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
    discharge_notes = nullif(clean_notes, ''),
    discharge_emergency_contact_ids = coalesce(p_emergency_contact_ids, '{}'::uuid[]),
    discharge_emergency_contacts_snapshot = contact_snapshot
  where id = resident_record.id;

  update public.resident_admission_episodes
  set
    status = 'discharged',
    discharge_date = effective_discharge_date,
    discharge_reason = clean_reason,
    discharge_emergency_contact_ids = coalesce(p_emergency_contact_ids, '{}'::uuid[]),
    discharge_emergency_contacts_snapshot = contact_snapshot,
    notes = nullif(clean_notes, ''),
    updated_at = now()
  where id = active_episode.id;

  return jsonb_build_object('ok', true, 'message', 'Resident discharged.');
end;
$function$;

grant execute on function public.discharge_resident(uuid, date, text, text, uuid[]) to authenticated;
