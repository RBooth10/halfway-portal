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

-- Resident-facing post-discharge satisfaction survey responses.

create table if not exists public.resident_satisfaction_survey_responses (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  overall_rating integer not null check (overall_rating between 1 and 5),
  felt_safe_rating integer check (felt_safe_rating between 1 and 5),
  staff_respect_rating integer check (staff_respect_rating between 1 and 5),
  expectations_clear_rating integer check (expectations_clear_rating between 1 and 5),
  recovery_support_rating integer check (recovery_support_rating between 1 and 5),
  would_recommend text,
  most_helpful text,
  could_improve text,
  additional_comments text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(resident_id)
);

create index if not exists idx_satisfaction_survey_provider_id
on public.resident_satisfaction_survey_responses(provider_id);

create index if not exists idx_satisfaction_survey_resident_id
on public.resident_satisfaction_survey_responses(resident_id);

alter table public.resident_satisfaction_survey_responses enable row level security;

drop policy if exists "Users can view satisfaction surveys for accessible providers"
on public.resident_satisfaction_survey_responses;

create policy "Users can view satisfaction surveys for accessible providers"
on public.resident_satisfaction_survey_responses
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create or replace function public.get_client_portal_satisfaction_survey(
  p_access_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.resident_portal_links%rowtype;
  resident_record public.residents%rowtype;
  survey_record public.resident_satisfaction_survey_responses%rowtype;
begin
  select *
  into link_record
  from public.resident_portal_links
  where access_token = p_access_token
    and access_token is not null
    and status = 'active'
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'This resident portal link is invalid, disabled, or expired.');
  end if;

  select *
  into resident_record
  from public.residents
  where id = link_record.resident_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Resident record was not found.');
  end if;

  select *
  into survey_record
  from public.resident_satisfaction_survey_responses
  where resident_id = resident_record.id
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'resident_status', resident_record.resident_status,
    'survey_available', resident_record.resident_status = 'discharged',
    'survey_completed', survey_record.id is not null,
    'survey_response',
      case
        when survey_record.id is null then null
        else jsonb_build_object(
          'id', survey_record.id,
          'overall_rating', survey_record.overall_rating,
          'felt_safe_rating', survey_record.felt_safe_rating,
          'staff_respect_rating', survey_record.staff_respect_rating,
          'expectations_clear_rating', survey_record.expectations_clear_rating,
          'recovery_support_rating', survey_record.recovery_support_rating,
          'would_recommend', survey_record.would_recommend,
          'most_helpful', survey_record.most_helpful,
          'could_improve', survey_record.could_improve,
          'additional_comments', survey_record.additional_comments,
          'submitted_at', survey_record.submitted_at
        )
      end
  );
end;
$$;

grant execute on function public.get_client_portal_satisfaction_survey(text)
to anon, authenticated;

create or replace function public.submit_client_portal_satisfaction_survey(
  p_access_token text,
  p_overall_rating integer,
  p_felt_safe_rating integer,
  p_staff_respect_rating integer,
  p_expectations_clear_rating integer,
  p_recovery_support_rating integer,
  p_would_recommend text,
  p_most_helpful text,
  p_could_improve text,
  p_additional_comments text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.resident_portal_links%rowtype;
  resident_record public.residents%rowtype;
  survey_id uuid;
begin
  select *
  into link_record
  from public.resident_portal_links
  where access_token = p_access_token
    and access_token is not null
    and status = 'active'
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'This resident portal link is invalid, disabled, or expired.');
  end if;

  select *
  into resident_record
  from public.residents
  where id = link_record.resident_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Resident record was not found.');
  end if;

  if resident_record.resident_status <> 'discharged' then
    return jsonb_build_object('ok', false, 'message', 'The discharge satisfaction survey is available after discharge.');
  end if;

  if p_overall_rating is null or p_overall_rating not between 1 and 5 then
    return jsonb_build_object('ok', false, 'message', 'Select an overall rating from 1 to 5.');
  end if;

  insert into public.resident_satisfaction_survey_responses (
    provider_id,
    resident_id,
    overall_rating,
    felt_safe_rating,
    staff_respect_rating,
    expectations_clear_rating,
    recovery_support_rating,
    would_recommend,
    most_helpful,
    could_improve,
    additional_comments,
    submitted_at,
    updated_at
  )
  values (
    resident_record.provider_id,
    resident_record.id,
    p_overall_rating,
    p_felt_safe_rating,
    p_staff_respect_rating,
    p_expectations_clear_rating,
    p_recovery_support_rating,
    nullif(trim(coalesce(p_would_recommend, '')), ''),
    nullif(trim(coalesce(p_most_helpful, '')), ''),
    nullif(trim(coalesce(p_could_improve, '')), ''),
    nullif(trim(coalesce(p_additional_comments, '')), ''),
    now(),
    now()
  )
  on conflict (resident_id)
  do update set
    overall_rating = excluded.overall_rating,
    felt_safe_rating = excluded.felt_safe_rating,
    staff_respect_rating = excluded.staff_respect_rating,
    expectations_clear_rating = excluded.expectations_clear_rating,
    recovery_support_rating = excluded.recovery_support_rating,
    would_recommend = excluded.would_recommend,
    most_helpful = excluded.most_helpful,
    could_improve = excluded.could_improve,
    additional_comments = excluded.additional_comments,
    submitted_at = now(),
    updated_at = now()
  returning id into survey_id;

  update public.residents
  set
    discharge_satisfaction_survey_completed = true,
    discharge_satisfaction_survey_rating = p_overall_rating,
    discharge_satisfaction_survey_notes = nullif(trim(coalesce(p_additional_comments, '')), ''),
    discharge_satisfaction_survey_completed_at = now()
  where id = resident_record.id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Survey submitted. Thank you.',
    'survey_id', survey_id
  );
end;
$$;

grant execute on function public.submit_client_portal_satisfaction_survey(
  text,
  integer,
  integer,
  integer,
  integer,
  integer,
  text,
  text,
  text,
  text
)
to anon, authenticated;

-- Ensure one discharge satisfaction survey response per resident for ON CONFLICT support.
create unique index if not exists unique_satisfaction_survey_response_per_resident
on public.resident_satisfaction_survey_responses(resident_id);
