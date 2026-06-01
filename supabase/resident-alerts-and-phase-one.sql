alter table public.residents
add column if not exists high_alert boolean not null default false,
add column if not exists high_alert_detail text,
add column if not exists active_probation_officer boolean not null default false,
add column if not exists active_mental_health_court boolean not null default false,
add column if not exists active_drug_court boolean not null default false;

alter table public.residents
alter column resident_status set default 'active';

create index if not exists idx_residents_alert_flags
on public.residents (
  provider_id,
  high_alert,
  active_probation_officer,
  active_mental_health_court,
  active_drug_court
);

create or replace function public.set_new_resident_phase_one()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  phase_record record;
begin
  if new.resident_status is null or new.resident_status = 'pending_admission' then
    new.resident_status := 'active';
  end if;

  if new.current_phase_id is null and new.provider_id is not null then
    select id, phase_name
    into phase_record
    from public.provider_phase_levels
    where provider_id = new.provider_id
      and is_active = true
    order by phase_order asc, created_at asc
    limit 1;

    if phase_record.id is not null then
      new.current_phase_id := phase_record.id;
      new.current_phase := phase_record.phase_name;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_new_resident_phase_one on public.residents;

create trigger trg_set_new_resident_phase_one
before insert on public.residents
for each row
execute function public.set_new_resident_phase_one();
