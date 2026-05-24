-- Resident lifecycle model.
-- Residents are either active or discharged.
-- Admission episodes preserve readmissions without losing prior resident history.

alter table public.residents
add column if not exists discharge_date date,
add column if not exists discharge_reason text,
add column if not exists discharge_notes text,
add column if not exists last_readmission_date date;

-- Normalize older resident status values into the new two-status model.
-- Anything currently archived, inactive, or discharged becomes discharged.
-- Anything else becomes active.
update public.residents
set resident_status = case
  when resident_status in ('discharged', 'archived', 'inactive') then 'discharged'
  else 'active'
end
where resident_status is null
   or resident_status not in ('active', 'discharged');

create table if not exists public.resident_admission_episodes (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  house_id uuid references public.houses(id) on delete set null,
  admission_date date not null default current_date,
  discharge_date date,
  status text not null default 'active',
  charge_admission_fee boolean not null default false,
  admission_fee_charge_id uuid references public.resident_fee_charges(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resident_admission_episodes_status_check check (status in ('active', 'discharged'))
);

create unique index if not exists unique_active_admission_episode_per_resident
on public.resident_admission_episodes (resident_id)
where status = 'active';

create index if not exists idx_resident_admission_episodes_provider_id
on public.resident_admission_episodes(provider_id);

create index if not exists idx_resident_admission_episodes_resident_id
on public.resident_admission_episodes(resident_id);

create index if not exists idx_resident_admission_episodes_status
on public.resident_admission_episodes(status);

alter table public.resident_admission_episodes enable row level security;

drop policy if exists "Users can view resident admission episodes for accessible providers" on public.resident_admission_episodes;
drop policy if exists "Authorized users can create resident admission episodes" on public.resident_admission_episodes;
drop policy if exists "Authorized users can update resident admission episodes" on public.resident_admission_episodes;

create policy "Users can view resident admission episodes for accessible providers"
on public.resident_admission_episodes
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create resident admission episodes"
on public.resident_admission_episodes
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update resident admission episodes"
on public.resident_admission_episodes
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

-- Seed one episode for existing residents if they do not already have one.
insert into public.resident_admission_episodes (
  provider_id,
  resident_id,
  house_id,
  admission_date,
  discharge_date,
  status,
  charge_admission_fee,
  notes
)
select
  r.provider_id,
  r.id,
  r.house_id,
  coalesce(r.admission_date, current_date),
  case
    when r.resident_status = 'discharged' then coalesce(r.discharge_date, current_date)
    else null
  end,
  case
    when r.resident_status = 'discharged' then 'discharged'
    else 'active'
  end,
  false,
  'Seeded from existing resident record.'
from public.residents r
where not exists (
  select 1
  from public.resident_admission_episodes existing
  where existing.resident_id = r.id
);

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
begin
  select *
  into resident_record
  from public.residents
  where id = p_resident_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Resident not found.');
  end if;

  if not public.current_user_can_manage_house_records(resident_record.provider_id) then
    return jsonb_build_object('ok', false, 'message', 'Not authorized to discharge this resident.');
  end if;

  update public.residents
  set
    resident_status = 'discharged',
    discharge_date = coalesce(p_discharge_date, current_date),
    discharge_reason = nullif(trim(coalesce(p_discharge_reason, '')), ''),
    discharge_notes = nullif(trim(coalesce(p_discharge_notes, '')), '')
  where id = resident_record.id;

  update public.resident_admission_episodes
  set
    status = 'discharged',
    discharge_date = coalesce(p_discharge_date, current_date),
    notes = nullif(trim(coalesce(p_discharge_notes, '')), notes),
    updated_at = now()
  where resident_id = resident_record.id
    and status = 'active';

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

  if not public.current_user_can_manage_house_records(resident_record.provider_id) then
    return jsonb_build_object('ok', false, 'message', 'Not authorized to readmit this resident.');
  end if;

  select count(*)
  into active_episode_count
  from public.resident_admission_episodes
  where resident_id = resident_record.id
    and status = 'active';

  if active_episode_count > 0 then
    return jsonb_build_object('ok', false, 'message', 'Resident already has an active admission episode.');
  end if;

  update public.residents
  set
    resident_status = 'active',
    admission_date = coalesce(p_admission_date, current_date),
    last_readmission_date = coalesce(p_admission_date, current_date),
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
    coalesce(p_admission_date, current_date),
    'active',
    coalesce(p_charge_admission_fee, false),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into new_episode_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Resident readmitted.',
    'episode_id', new_episode_id,
    'charge_admission_fee', coalesce(p_charge_admission_fee, false)
  );
end;
$$;

grant execute on function public.readmit_resident(uuid, date, uuid, boolean, text) to authenticated;
