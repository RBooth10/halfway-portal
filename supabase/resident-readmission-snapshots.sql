-- Preserve resident intake/profile state before readmission.
-- This runs automatically inside readmit_resident before the resident is changed back to active.

create table if not exists public.resident_readmission_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  created_by_auth_user_id uuid,
  snapshot_reason text not null default 'readmission',
  snapshot_taken_at timestamptz not null default now(),
  readmission_date date not null,

  previous_house_id uuid references public.houses(id) on delete set null,
  previous_admission_date date,
  previous_discharge_date date,
  previous_discharge_reason text,
  previous_discharge_notes text,
  previous_resident_status text,
  previous_file_status text,
  previous_medication_status text,
  previous_rci_status text,
  previous_current_phase_id uuid,
  previous_current_phase text,
  previous_has_sponsor boolean,
  previous_has_home_group boolean,
  previous_attending_required_meetings boolean,
  previous_recovery_plan_started boolean,
  previous_program_fees_current boolean,
  previous_medication_status_reviewed boolean,
  previous_notes text,

  snapshot_data jsonb not null default '{}'::jsonb
);

create index if not exists idx_resident_readmission_snapshots_provider_id
on public.resident_readmission_snapshots(provider_id);

create index if not exists idx_resident_readmission_snapshots_resident_id
on public.resident_readmission_snapshots(resident_id);

create index if not exists idx_resident_readmission_snapshots_taken_at
on public.resident_readmission_snapshots(snapshot_taken_at);

alter table public.resident_readmission_snapshots enable row level security;

drop policy if exists "Users can view readmission snapshots for accessible providers"
on public.resident_readmission_snapshots;

drop policy if exists "Authorized users can create readmission snapshots"
on public.resident_readmission_snapshots;

create policy "Users can view readmission snapshots for accessible providers"
on public.resident_readmission_snapshots
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create readmission snapshots"
on public.resident_readmission_snapshots
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

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
  snapshot_id uuid;
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

  insert into public.resident_readmission_snapshots (
    provider_id,
    resident_id,
    created_by_auth_user_id,
    snapshot_reason,
    readmission_date,
    previous_house_id,
    previous_admission_date,
    previous_discharge_date,
    previous_discharge_reason,
    previous_discharge_notes,
    previous_resident_status,
    previous_file_status,
    previous_medication_status,
    previous_rci_status,
    previous_current_phase_id,
    previous_current_phase,
    previous_has_sponsor,
    previous_has_home_group,
    previous_attending_required_meetings,
    previous_recovery_plan_started,
    previous_program_fees_current,
    previous_medication_status_reviewed,
    previous_notes,
    snapshot_data
  )
  values (
    resident_record.provider_id,
    resident_record.id,
    auth.uid(),
    'readmission',
    effective_admission_date,
    resident_record.house_id,
    resident_record.admission_date,
    resident_record.discharge_date,
    resident_record.discharge_reason,
    resident_record.discharge_notes,
    resident_record.resident_status,
    resident_record.file_status,
    resident_record.medication_status,
    resident_record.rci_status,
    resident_record.current_phase_id,
    resident_record.current_phase,
    resident_record.has_sponsor,
    resident_record.has_home_group,
    resident_record.attending_required_meetings,
    resident_record.recovery_plan_started,
    resident_record.program_fees_current,
    resident_record.medication_status_reviewed,
    resident_record.notes,
    to_jsonb(resident_record)
  )
  returning id into snapshot_id;

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
    'snapshot_id', snapshot_id,
    'charge_admission_fee', coalesce(p_charge_admission_fee, false)
  );
end;
$$;

grant execute on function public.readmit_resident(uuid, date, uuid, boolean, text) to authenticated;
