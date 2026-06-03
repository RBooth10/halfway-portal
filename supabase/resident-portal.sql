-- Persistent resident portal link and client-facing portal RPCs.
-- One portal link should be generated once at intake and remain active for ongoing resident access.

create table if not exists public.resident_portal_links (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  house_id uuid references public.houses(id) on delete set null,
  created_by_auth_user_id uuid references auth.users(id) on delete set null,
  access_token text not null unique,
  status text not null default 'active'
    check (status in ('active', 'disabled')),
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists unique_active_resident_portal_link
on public.resident_portal_links(resident_id)
where status = 'active';

create index if not exists idx_resident_portal_links_provider_id
on public.resident_portal_links(provider_id);

create index if not exists idx_resident_portal_links_resident_id
on public.resident_portal_links(resident_id);

create index if not exists idx_resident_portal_links_access_token
on public.resident_portal_links(access_token);

alter table public.resident_portal_links enable row level security;

drop policy if exists "Users can view resident portal links for accessible providers"
on public.resident_portal_links;

drop policy if exists "Authorized users can create resident portal links"
on public.resident_portal_links;

drop policy if exists "Authorized users can update resident portal links"
on public.resident_portal_links;

create policy "Users can view resident portal links for accessible providers"
on public.resident_portal_links
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create resident portal links"
on public.resident_portal_links
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update resident portal links"
on public.resident_portal_links
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

create or replace function public.get_client_portal_context(p_access_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  link_record public.resident_portal_links%rowtype;
  resident_record public.residents%rowtype;
  house_record public.houses%rowtype;
  document_data jsonb;
  charge_data jsonb;
  payment_data jsonb;
  pass_request_data jsonb;
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

  update public.resident_portal_links
  set last_used_at = now()
  where id = link_record.id;

  select *
  into resident_record
  from public.residents
  where id = link_record.resident_id
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Resident record was not found.'
    );
  end if;

  if coalesce(link_record.house_id, resident_record.house_id) is not null then
    select *
    into house_record
    from public.houses
    where id = coalesce(link_record.house_id, resident_record.house_id)
    limit 1;
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'assignment_id', rda.id,
      'assignment_status', rda.assignment_status,
      'signature_status', rda.signature_status,
      'signature_required_from', rda.signature_required_from,
      'signature_instructions', rda.signature_instructions,
      'signed_by_name', rda.signed_by_name,
      'signed_at', rda.signed_at,
      'document_id', d.id,
      'document_name', d.document_name,
      'category', d.category,
      'file_url', coalesce(rda.signed_file_url, d.file_url),
      'notes', d.notes
    )
    order by d.document_name
  )
  into document_data
  from public.resident_document_assignments rda
  join public.documents d on d.id = rda.document_id
  where rda.resident_id = link_record.resident_id
    and rda.assignment_status <> 'archived';

  select jsonb_agg(
    jsonb_build_object(
      'id', charge.id,
      'charge_type', charge.charge_type,
      'billing_frequency', charge.billing_frequency,
      'period_start', charge.period_start,
      'period_end', charge.period_end,
      'due_date', charge.due_date,
      'amount', charge.amount,
      'amount_paid', charge.amount_paid,
      'balance_due', charge.balance_due,
      'status', charge.status,
      'notes', charge.notes
    )
    order by charge.due_date desc nulls last, charge.created_at desc
  )
  into charge_data
  from public.resident_fee_charges charge
  where charge.resident_id = link_record.resident_id;

  select jsonb_agg(
    jsonb_build_object(
      'id', payment.id,
      'fee_charge_id', payment.fee_charge_id,
      'payment_date', payment.payment_date,
      'amount', payment.amount,
      'payment_method', payment.payment_method,
      'reference_number', payment.reference_number,
      'notes', payment.notes
    )
    order by payment.payment_date desc, payment.created_at desc
  )
  into payment_data
  from public.resident_payments payment
  where payment.resident_id = link_record.resident_id;

  select jsonb_agg(
    jsonb_build_object(
      'id', pass_request.id,
      'requested_departure_at', pass_request.requested_departure_at,
      'requested_return_at', pass_request.requested_return_at,
      'destination', pass_request.destination,
      'destination_address', pass_request.destination_address,
      'reason', pass_request.reason,
      'transportation_plan', pass_request.transportation_plan,
      'emergency_contact_plan', pass_request.emergency_contact_plan,
      'emergency_contact_name', pass_request.emergency_contact_name,
      'emergency_contact_relationship', pass_request.emergency_contact_relationship,
      'emergency_contact_phone', pass_request.emergency_contact_phone,
      'resident_agreed_to_terms', pass_request.resident_agreed_to_terms,
      'resident_signature_name', pass_request.resident_signature_name,
      'resident_signed_at', pass_request.resident_signed_at,
      'status', pass_request.status,
      'provider_notes', pass_request.provider_notes,
      'denial_reason', pass_request.denial_reason,
      'requires_court_order', pass_request.requires_court_order,
      'requires_clinical_clearance', pass_request.requires_clinical_clearance,
      'requires_emergency_travel_docs', pass_request.requires_emergency_travel_docs,
      'requires_other_attachment', pass_request.requires_other_attachment,
      'other_attachment_note', pass_request.other_attachment_note,
      'reviewed_at', pass_request.reviewed_at,
      'created_at', pass_request.created_at
    )
    order by pass_request.created_at desc
  )
  into pass_request_data
  from public.resident_pass_requests pass_request
  where pass_request.resident_id = link_record.resident_id;

  return jsonb_build_object(
    'ok', true,
    'resident_id', resident_record.id,
    'resident_name', concat_ws(' ', resident_record.first_name, resident_record.last_name),
    'house_name', house_record.name,
    'resident_status', resident_record.resident_status,
    'sponsor_name', resident_record.sponsor_name,
    'sponsor_phone', resident_record.sponsor_phone,
    'current_step', resident_record.current_step,
    'sponsor_info_updated_at', resident_record.sponsor_info_updated_at,
    'documents', coalesce(document_data, '[]'::jsonb),
    'fee_charges', coalesce(charge_data, '[]'::jsonb),
    'payments', coalesce(payment_data, '[]'::jsonb),
    'pass_requests', coalesce(pass_request_data, '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_client_portal_maintenance_request(
  p_access_token text,
  p_request_title text,
  p_request_description text,
  p_location_area text,
  p_priority text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.resident_portal_links%rowtype;
  resident_record public.residents%rowtype;
  clean_title text := trim(coalesce(p_request_title, ''));
  clean_description text := trim(coalesce(p_request_description, ''));
  clean_location text := nullif(trim(coalesce(p_location_area, '')), '');
  clean_priority text := lower(trim(coalesce(p_priority, 'normal')));
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

  if length(clean_title) < 3 then
    return jsonb_build_object('ok', false, 'message', 'Request title is required.');
  end if;

  if length(clean_description) < 10 then
    return jsonb_build_object('ok', false, 'message', 'Please describe the maintenance issue.');
  end if;

  if clean_priority not in ('low', 'normal', 'urgent') then
    clean_priority := 'normal';
  end if;

  insert into public.resident_maintenance_requests (
    provider_id,
    house_id,
    resident_id,
    submitted_by_name,
    request_title,
    request_description,
    location_area,
    priority,
    status
  )
  values (
    link_record.provider_id,
    coalesce(link_record.house_id, resident_record.house_id),
    resident_record.id,
    concat_ws(' ', resident_record.first_name, resident_record.last_name),
    clean_title,
    clean_description,
    clean_location,
    clean_priority,
    'open'
  )
  returning id into request_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Maintenance request submitted.',
    'request_id', request_id
  );
end;
$$;

grant execute on function public.get_client_portal_context(text) to anon, authenticated;
grant execute on function public.submit_client_portal_maintenance_request(text, text, text, text, text) to anon, authenticated;

-- Resident portal pass request history/status lookup.
create or replace function public.get_client_portal_pass_requests(p_access_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.resident_portal_links%rowtype;
  pass_request_data jsonb;
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
      'message', 'This resident portal link is invalid, disabled, or expired.',
      'pass_requests', '[]'::jsonb
    );
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', pass_request.id,
      'requested_departure_at', pass_request.requested_departure_at,
      'requested_return_at', pass_request.requested_return_at,
      'destination', pass_request.destination,
      'destination_address', pass_request.destination_address,
      'reason', pass_request.reason,
      'transportation_plan', pass_request.transportation_plan,
      'emergency_contact_plan', pass_request.emergency_contact_plan,
      'emergency_contact_name', pass_request.emergency_contact_name,
      'emergency_contact_relationship', pass_request.emergency_contact_relationship,
      'emergency_contact_phone', pass_request.emergency_contact_phone,
      'resident_agreed_to_terms', pass_request.resident_agreed_to_terms,
      'resident_signature_name', pass_request.resident_signature_name,
      'resident_signed_at', pass_request.resident_signed_at,
      'status', pass_request.status,
      'provider_notes', pass_request.provider_notes,
      'denial_reason', pass_request.denial_reason,
      'requires_court_order', pass_request.requires_court_order,
      'requires_clinical_clearance', pass_request.requires_clinical_clearance,
      'requires_emergency_travel_docs', pass_request.requires_emergency_travel_docs,
      'requires_other_attachment', pass_request.requires_other_attachment,
      'other_attachment_note', pass_request.other_attachment_note,
      'reviewed_at', pass_request.reviewed_at,
      'created_at', pass_request.created_at
    )
    order by pass_request.created_at desc
  )
  into pass_request_data
  from public.resident_pass_requests pass_request
  where pass_request.resident_id = link_record.resident_id;

  return jsonb_build_object(
    'ok', true,
    'pass_requests', coalesce(pass_request_data, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_client_portal_pass_requests(text)
to anon, authenticated;
