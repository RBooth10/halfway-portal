-- Expanded resident pass request form fields.

alter table public.resident_pass_requests
add column if not exists destination_address text,
add column if not exists emergency_contact_name text,
add column if not exists emergency_contact_relationship text,
add column if not exists emergency_contact_phone text,
add column if not exists resident_agreed_to_terms boolean not null default false,
add column if not exists resident_signature_name text,
add column if not exists resident_signed_at timestamptz,
add column if not exists requires_court_order boolean not null default false,
add column if not exists requires_clinical_clearance boolean not null default false,
add column if not exists requires_emergency_travel_docs boolean not null default false,
add column if not exists requires_other_attachment boolean not null default false,
add column if not exists other_attachment_note text,
add column if not exists denial_reason text;

create or replace function public.submit_client_portal_pass_request(
  p_access_token text,
  p_requested_departure_at timestamptz,
  p_requested_return_at timestamptz,
  p_destination text,
  p_reason text,
  p_transportation_plan text,
  p_emergency_contact_plan text,
  p_destination_address text default null,
  p_emergency_contact_name text default null,
  p_emergency_contact_relationship text default null,
  p_emergency_contact_phone text default null,
  p_resident_agreed_to_terms boolean default false,
  p_resident_signature_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.resident_portal_links%rowtype;
  resident_record public.residents%rowtype;
  clean_destination text := trim(coalesce(p_destination, ''));
  clean_destination_address text := trim(coalesce(p_destination_address, ''));
  clean_reason text := nullif(trim(coalesce(p_reason, '')), '');
  clean_transportation text := nullif(trim(coalesce(p_transportation_plan, '')), '');
  clean_emergency_plan text := nullif(trim(coalesce(p_emergency_contact_plan, '')), '');
  clean_emergency_contact_name text := trim(coalesce(p_emergency_contact_name, ''));
  clean_emergency_contact_relationship text := trim(coalesce(p_emergency_contact_relationship, ''));
  clean_emergency_contact_phone text := trim(coalesce(p_emergency_contact_phone, ''));
  clean_signature_name text := trim(coalesce(p_resident_signature_name, ''));
  request_id uuid;
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

  select *
  into resident_record
  from public.residents
  where id = link_record.resident_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Resident record was not found.');
  end if;

  if clean_destination_address = '' then
    return jsonb_build_object('ok', false, 'message', 'Destination address is required.');
  end if;

  if clean_destination = '' then
    clean_destination := clean_destination_address;
  end if;

  if p_requested_departure_at is null or p_requested_return_at is null then
    return jsonb_build_object('ok', false, 'message', 'Departure and return times are required.');
  end if;

  if p_requested_return_at <= p_requested_departure_at then
    return jsonb_build_object('ok', false, 'message', 'Return time must be after departure time.');
  end if;

  if clean_reason is null then
    return jsonb_build_object('ok', false, 'message', 'Purpose of request is required.');
  end if;

  if clean_emergency_contact_name = '' then
    return jsonb_build_object('ok', false, 'message', 'Emergency contact name is required.');
  end if;

  if clean_emergency_contact_relationship = '' then
    return jsonb_build_object('ok', false, 'message', 'Emergency contact relationship is required.');
  end if;

  if clean_emergency_contact_phone = '' then
    return jsonb_build_object('ok', false, 'message', 'Emergency contact phone number is required.');
  end if;

  if coalesce(p_resident_agreed_to_terms, false) is not true then
    return jsonb_build_object('ok', false, 'message', 'Resident agreement must be confirmed before submitting.');
  end if;

  if clean_signature_name = '' then
    return jsonb_build_object('ok', false, 'message', 'Resident typed signature is required.');
  end if;

  insert into public.resident_pass_requests (
    provider_id,
    house_id,
    resident_id,
    requested_departure_at,
    requested_return_at,
    destination,
    destination_address,
    reason,
    transportation_plan,
    emergency_contact_plan,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_phone,
    resident_agreed_to_terms,
    resident_signature_name,
    resident_signed_at,
    status
  )
  values (
    link_record.provider_id,
    coalesce(link_record.house_id, resident_record.house_id),
    resident_record.id,
    p_requested_departure_at,
    p_requested_return_at,
    clean_destination,
    clean_destination_address,
    clean_reason,
    clean_transportation,
    clean_emergency_plan,
    clean_emergency_contact_name,
    clean_emergency_contact_relationship,
    clean_emergency_contact_phone,
    true,
    clean_signature_name,
    now(),
    'pending'
  )
  returning id into request_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Pass request submitted.',
    'request_id', request_id
  );
end;
$$;

grant execute on function public.submit_client_portal_pass_request(
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  text
) to anon, authenticated;

-- Compatibility wrapper for resident portal pass request payload submission.
-- The client portal currently calls submit_client_portal_pass_request_v2(p_payload jsonb).
-- This wrapper maps that payload to the expanded submit_client_portal_pass_request function.

create or replace function public.submit_client_portal_pass_request_v2(
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.submit_client_portal_pass_request(
    p_payload ->> 'access_token',
    nullif(p_payload ->> 'requested_departure_at', '')::timestamptz,
    nullif(p_payload ->> 'requested_return_at', '')::timestamptz,
    p_payload ->> 'destination',
    p_payload ->> 'reason',
    p_payload ->> 'transportation_plan',
    p_payload ->> 'emergency_contact_plan',
    p_payload ->> 'destination_address',
    p_payload ->> 'emergency_contact_name',
    p_payload ->> 'emergency_contact_relationship',
    p_payload ->> 'emergency_contact_phone',
    coalesce((p_payload ->> 'resident_agreed_to_terms')::boolean, false),
    p_payload ->> 'resident_signature_name'
  );
end;
$$;

grant execute on function public.submit_client_portal_pass_request_v2(jsonb)
to anon, authenticated;

-- Compatibility wrapper for resident portal pass request payload submission.
-- The client portal currently calls submit_client_portal_pass_request_v2(p_payload jsonb).
-- This wrapper maps that payload to the expanded submit_client_portal_pass_request function.

create or replace function public.submit_client_portal_pass_request_v2(
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.submit_client_portal_pass_request(
    p_payload ->> 'access_token',
    nullif(p_payload ->> 'requested_departure_at', '')::timestamptz,
    nullif(p_payload ->> 'requested_return_at', '')::timestamptz,
    p_payload ->> 'destination',
    p_payload ->> 'reason',
    p_payload ->> 'transportation_plan',
    p_payload ->> 'emergency_contact_plan',
    p_payload ->> 'destination_address',
    p_payload ->> 'emergency_contact_name',
    p_payload ->> 'emergency_contact_relationship',
    p_payload ->> 'emergency_contact_phone',
    coalesce((p_payload ->> 'resident_agreed_to_terms')::boolean, false),
    p_payload ->> 'resident_signature_name'
  );
end;
$$;

grant execute on function public.submit_client_portal_pass_request_v2(jsonb)
to anon, authenticated;
