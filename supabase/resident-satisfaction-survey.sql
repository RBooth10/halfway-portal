-- Optional satisfaction survey fields captured during resident discharge.

alter table public.residents
add column if not exists discharge_satisfaction_survey_completed boolean not null default false,
add column if not exists discharge_satisfaction_survey_rating integer,
add column if not exists discharge_satisfaction_survey_notes text,
add column if not exists discharge_satisfaction_survey_completed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'residents_discharge_satisfaction_rating_check'
  ) then
    alter table public.residents
    add constraint residents_discharge_satisfaction_rating_check
    check (
      discharge_satisfaction_survey_rating is null
      or discharge_satisfaction_survey_rating between 1 and 5
    );
  end if;
end $$;
