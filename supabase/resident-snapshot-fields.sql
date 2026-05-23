-- Resident snapshot fields for phase and recovery/program requirements.

alter table public.residents
add column if not exists current_phase text,
add column if not exists has_sponsor boolean not null default false,
add column if not exists has_home_group boolean not null default false,
add column if not exists attending_required_meetings boolean not null default false,
add column if not exists recovery_plan_started boolean not null default false,
add column if not exists program_fees_current boolean not null default false,
add column if not exists medication_status_reviewed boolean not null default false;
