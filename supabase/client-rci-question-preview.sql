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
      'max_score', q.max_score,
      'reverse_scored', q.reverse_scored
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

grant execute on function public.get_client_rci_assessment(text) to anon, authenticated;
