-- Allow residents to sign assigned documents from the persistent resident portal.

create or replace function public.submit_client_portal_document_signature(
  p_access_token text,
  p_assignment_id uuid,
  p_signed_by_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.resident_portal_links%rowtype;
  assignment_record public.resident_document_assignments%rowtype;
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
    return jsonb_build_object(
      'ok', false,
      'message', 'This resident portal link is invalid, disabled, or expired.'
    );
  end if;

  if p_signed_by_name is null or length(trim(p_signed_by_name)) = 0 then
    return jsonb_build_object(
      'ok', false,
      'message', 'Typed signature name is required.'
    );
  end if;

  select *
  into assignment_record
  from public.resident_document_assignments
  where id = p_assignment_id
    and resident_id = link_record.resident_id
    and signature_required_from = 'resident'
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'This document assignment was not found for this resident.'
    );
  end if;

  if assignment_record.signature_status = 'signed' then
    return jsonb_build_object(
      'ok', false,
      'message', 'This document has already been signed and cannot be changed.'
    );
  end if;

  update public.resident_document_assignments rda
  set
    signature_status = 'signed',
    signed_by_name = trim(p_signed_by_name),
    signed_at = now(),
    signature_method = 'electronic_typed_signature',
    assignment_status = 'completed',
    signed_file_url = d.file_url,
    updated_at = now()
  from public.documents d
  where rda.id = assignment_record.id
    and d.id = rda.document_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Document signed successfully.'
  );
end;
$$;

grant execute on function public.submit_client_portal_document_signature(text, uuid, text) to anon, authenticated;
