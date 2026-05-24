-- Cleanup legacy resident fee charges and move admission fees to episode-based logic.

alter table public.resident_fee_charges
add column if not exists resident_admission_episode_id uuid
references public.resident_admission_episodes(id) on delete set null;

create index if not exists idx_resident_fee_charges_admission_episode_id
on public.resident_fee_charges(resident_admission_episode_id);

update public.resident_fee_charges c
set resident_admission_episode_id = e.id
from public.resident_admission_episodes e
where c.resident_id = e.resident_id
  and e.status = 'active'
  and c.charge_type = 'program_fee'
  and c.resident_admission_episode_id is null;

delete from public.resident_fee_charges c
where c.charge_type = 'admission_fee'
  and c.amount_paid = 0
  and c.resident_admission_episode_id is null
  and not exists (
    select 1
    from public.resident_admission_episodes e
    where e.resident_id = c.resident_id
      and e.charge_admission_fee = true
  );

drop index if exists public.unique_admission_fee_per_resident;

create unique index if not exists unique_admission_fee_per_episode
on public.resident_fee_charges (resident_admission_episode_id, charge_type)
where charge_type = 'admission_fee'
  and resident_admission_episode_id is not null;

create unique index if not exists unique_program_fee_per_resident_period
on public.resident_fee_charges (resident_id, charge_type, period_start, period_end)
where charge_type = 'program_fee';
