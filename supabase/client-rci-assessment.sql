-- Client-completable RCI assessment engine.
-- Allows staff to generate a secure link and clients to complete an RCI without portal login.

alter table public.rci_assessments
add column if not exists client_access_token text unique,
add column if not exists client_link_expires_at timestamptz,
add column if not exists client_started_at timestamptz,
add column if not exists client_completed_at timestamptz,
add column if not exists client_name text,
add column if not exists client_email text;

create table if not exists public.rci_questions (
  id uuid primary key default gen_random_uuid(),
  rci_version text not null default 'RCI-36',
  question_number integer not null,
  domain text,
  question_text text not null,
  response_type text not null default 'scale',
  min_score integer not null default 0,
  max_score integer not null default 5,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (rci_version, question_number)
);

create table if not exists public.rci_assessment_responses (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  assessment_id uuid not null references public.rci_assessments(id) on delete cascade,
  question_id uuid not null references public.rci_questions(id) on delete cascade,
  response_score integer,
  response_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, question_id)
);

create index if not exists idx_rci_questions_version on public.rci_questions(rci_version);
create index if not exists idx_rci_responses_provider_id on public.rci_assessment_responses(provider_id);
create index if not exists idx_rci_responses_resident_id on public.rci_assessment_responses(resident_id);
create index if not exists idx_rci_responses_assessment_id on public.rci_assessment_responses(assessment_id);
create index if not exists idx_rci_assessments_client_access_token on public.rci_assessments(client_access_token);

alter table public.rci_questions enable row level security;
alter table public.rci_assessment_responses enable row level security;

drop policy if exists "Authenticated users can view active RCI questions" on public.rci_questions;
drop policy if exists "Users can view RCI responses for accessible providers" on public.rci_assessment_responses;
drop policy if exists "Authorized users can create RCI responses" on public.rci_assessment_responses;
drop policy if exists "Authorized users can update RCI responses" on public.rci_assessment_responses;

create policy "Authenticated users can view active RCI questions"
on public.rci_questions
for select
to authenticated
using (is_active = true);

create policy "Users can view RCI responses for accessible providers"
on public.rci_assessment_responses
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create RCI responses"
on public.rci_assessment_responses
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update RCI responses"
on public.rci_assessment_responses
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

-- Demo questions for testing only. Replace with approved official RCI wording before real use.
insert into public.rci_questions
  (rci_version, question_number, domain, question_text, min_score, max_score)
values
  ('DEMO-RCI', 1, 'Recovery Stability', 'Demo question 1: I have safe and stable recovery housing.', 0, 5),
  ('DEMO-RCI', 2, 'Recovery Support', 'Demo question 2: I have people who support my recovery.', 0, 5),
  ('DEMO-RCI', 3, 'Health', 'Demo question 3: I am able to access health or behavioral health support when needed.', 0, 5),
  ('DEMO-RCI', 4, 'Daily Living', 'Demo question 4: I am able to manage daily responsibilities.', 0, 5),
  ('DEMO-RCI', 5, 'Purpose', 'Demo question 5: I have goals or activities that support my recovery.', 0, 5)
on conflict (rci_version, question_number) do nothing;

create or replace function public.get_client_rci_assessment(p_access_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  assessment_record public.rci_assessments%rowtype;
  question_data jsonb;
begin
  select *
  into assessment_record
  from public.rci_assessments
  where client_access_token = p_access_token
    and client_access_token is not null
    and (client_link_expires_at is null or client_link_expires_at > now())
    and status in ('sent', 'started', 'pending', 'needs_review')
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'This assessment link is invalid, expired, or already completed.'
    );
  end if;

  update public.rci_assessments
  set
    status = case when status = 'sent' then 'started' else status end,
    client_started_at = coalesce(client_started_at, now())
  where id = assessment_record.id;

  select jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'question_number', q.question_number,
      'domain', q.domain,
      'question_text', q.question_text,
      'response_type', q.response_type,
      'min_score', q.min_score,
      'max_score', q.max_score
    )
    order by q.question_number
  )
  into question_data
  from public.rci_questions q
  where q.rci_version = assessment_record.rci_version
    and q.is_active = true;

  return jsonb_build_object(
    'ok', true,
    'assessment_id', assessment_record.id,
    'resident_id', assessment_record.resident_id,
    'rci_version', assessment_record.rci_version,
    'questions', coalesce(question_data, '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_client_rci_assessment(
  p_access_token text,
  p_client_name text,
  p_client_email text,
  p_responses jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_record public.rci_assessments%rowtype;
  response_record record;
  question_record record;
  adjusted_score numeric := 0;
  total_score numeric := 0;
  max_possible numeric := 0;
  personal_score numeric := 0;
  personal_max numeric := 0;
  social_score numeric := 0;
  social_max numeric := 0;
  cultural_score numeric := 0;
  cultural_max numeric := 0;
  score_percent numeric := 0;
  calculated_level text := null;
  personal_level text := null;
  social_level text := null;
  cultural_level text := null;
  summary_text text := null;
  strengths_text text := null;
  needs_text text := null;
begin
  select *
  into assessment_record
  from public.rci_assessments
  where client_access_token = p_access_token
    and client_access_token is not null
    and (client_link_expires_at is null or client_link_expires_at > now())
    and status in ('sent', 'started', 'pending', 'needs_review')
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'This assessment link is invalid, expired, or already completed.'
    );
  end if;

  delete from public.rci_assessment_responses
  where assessment_id = assessment_record.id;

  for response_record in
    select *
    from jsonb_to_recordset(p_responses)
      as x(question_id uuid, response_score integer, response_text text)
  loop
    select
      q.id,
      q.domain,
      q.min_score,
      q.max_score,
      q.reverse_scored
    into question_record
    from public.rci_questions q
    where q.id = response_record.question_id;

    if question_record.reverse_scored then
      adjusted_score := question_record.max_score + question_record.min_score - coalesce(response_record.response_score, 0);
    else
      adjusted_score := coalesce(response_record.response_score, 0);
    end if;

    insert into public.rci_assessment_responses (
      provider_id,
      resident_id,
      assessment_id,
      question_id,
      response_score,
      response_text
    )
    values (
      assessment_record.provider_id,
      assessment_record.resident_id,
      assessment_record.id,
      response_record.question_id,
      adjusted_score,
      response_record.response_text
    );

    total_score := total_score + adjusted_score;
    max_possible := max_possible + coalesce(question_record.max_score, 0);

    if question_record.domain = 'Personal Capital' then
      personal_score := personal_score + adjusted_score;
      personal_max := personal_max + coalesce(question_record.max_score, 0);
    elsif question_record.domain = 'Social Capital' then
      social_score := social_score + adjusted_score;
      social_max := social_max + coalesce(question_record.max_score, 0);
    elsif question_record.domain = 'Cultural Capital' then
      cultural_score := cultural_score + adjusted_score;
      cultural_max := cultural_max + coalesce(question_record.max_score, 0);
    end if;
  end loop;

  if max_possible = 0 then
    calculated_level := null;
    score_percent := 0;
  else
    score_percent := round((total_score / max_possible) * 100, 2);

    if total_score / max_possible < 0.4 then
      calculated_level := 'low';
    elsif total_score / max_possible < 0.7 then
      calculated_level := 'moderate';
    else
      calculated_level := 'high';
    end if;
  end if;

  if personal_max > 0 then
    if personal_score / personal_max < 0.4 then
      personal_level := 'low';
    elsif personal_score / personal_max < 0.7 then
      personal_level := 'moderate';
    else
      personal_level := 'high';
    end if;
  end if;

  if social_max > 0 then
    if social_score / social_max < 0.4 then
      social_level := 'low';
    elsif social_score / social_max < 0.7 then
      social_level := 'moderate';
    else
      social_level := 'high';
    end if;
  end if;

  if cultural_max > 0 then
    if cultural_score / cultural_max < 0.4 then
      cultural_level := 'low';
    elsif cultural_score / cultural_max < 0.7 then
      cultural_level := 'moderate';
    else
      cultural_level := 'high';
    end if;
  end if;

  if calculated_level = 'high' then
    summary_text := 'Resident completed the RCI assessment and demonstrated high recovery capital based on the completed responses.';
    strengths_text := 'Overall responses suggest several recovery capital strengths. Continue reinforcing current supports, routines, and recovery-oriented goals.';
    needs_text := 'Continue monitoring any lower-scored areas and use the results to guide recovery planning and ongoing support.';
  elsif calculated_level = 'moderate' then
    summary_text := 'Resident completed the RCI assessment and demonstrated moderate recovery capital based on the completed responses.';
    strengths_text := 'Resident appears to have some recovery capital strengths that can be built upon during recovery planning.';
    needs_text := 'Assessment results suggest continued support is needed in one or more recovery capital areas. Review lower-scored areas when building the recovery plan.';
  elsif calculated_level = 'low' then
    summary_text := 'Resident completed the RCI assessment and demonstrated low recovery capital based on the completed responses.';
    strengths_text := 'Identify and reinforce any existing supports, motivation, or protective factors noted during follow-up.';
    needs_text := 'Assessment results suggest significant recovery capital needs. Prioritize support planning, connection to resources, and close follow-up.';
  else
    summary_text := 'Resident completed the RCI assessment, but a recovery capital level could not be calculated.';
    strengths_text := null;
    needs_text := 'Review assessment responses and determine whether follow-up is needed.';
  end if;

  update public.rci_assessments
  set
    client_name = nullif(trim(p_client_name), ''),
    client_email = nullif(trim(p_client_email), ''),
    rci_score = total_score,
    recovery_capital_level = calculated_level,
    status = 'completed',
    client_completed_at = now(),
    assessment_date = current_date,
    personal_capital_score = personal_score,
    personal_capital_level = personal_level,
    personal_capital_summary =
      'Personal Capital score: ' || personal_score || ' out of ' || personal_max || '. Level: ' || coalesce(personal_level, 'not calculated') || '.',
    social_capital_score = social_score,
    social_capital_level = social_level,
    social_capital_summary =
      'Social Capital score: ' || social_score || ' out of ' || social_max || '. Level: ' || coalesce(social_level, 'not calculated') || '.',
    cultural_capital_score = cultural_score,
    cultural_capital_level = cultural_level,
    cultural_capital_summary =
      'Cultural Capital score: ' || cultural_score || ' out of ' || cultural_max || '. Level: ' || coalesce(cultural_level, 'not calculated') || '.',
    strengths_summary = strengths_text,
    needs_summary = needs_text,
    overall_summary = summary_text || ' Overall score: ' || total_score || ' out of ' || max_possible || ' (' || score_percent || '%).',
    notes = summary_text || ' Score: ' || total_score || ' out of ' || max_possible || ' (' || score_percent || '%).'
  where id = assessment_record.id;

  update public.residents
  set rci_status = 'completed'
  where id = assessment_record.resident_id;

  return jsonb_build_object(
    'ok', true,
    'assessment_id', assessment_record.id,
    'total_score', total_score,
    'max_possible', max_possible,
    'score_percent', score_percent,
    'recovery_capital_level', calculated_level,
    'personal_capital_score', personal_score,
    'personal_capital_level', personal_level,
    'social_capital_score', social_score,
    'social_capital_level', social_level,
    'cultural_capital_score', cultural_score,
    'cultural_capital_level', cultural_level,
    'summary', summary_text,
    'message', 'Assessment submitted successfully.'
  );
end;
$$;

grant execute on function public.get_client_rci_assessment(text) to anon, authenticated;
grant execute on function public.submit_client_rci_assessment(text, text, text, jsonb) to anon, authenticated;
