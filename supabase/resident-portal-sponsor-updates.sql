-- Resident portal sponsor/step updates with provider-visible timestamp and sponsor ROI.

alter table public.residents
add column if not exists sponsor_name text,
add column if not exists sponsor_phone text,
add column if not exists current_step text,
add column if not exists sponsor_info_updated_at timestamptz;

drop function if exists public.update_client_portal_sponsor_info(text, text, text, text);
drop function if exists public.update_client_portal_sponsor_info(text, text, text, text, boolean, text);

create or replace function public.update_client_portal_sponsor_info(
  p_access_token text,
  p_sponsor_name text,
  p_sponsor_phone text,
  p_current_step text,
  p_roi_agreed boolean default false,
  p_roi_signature_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.resident_portal_links%rowtype;
  resident_record public.residents%rowtype;
  clean_sponsor_name text := nullif(trim(coalesce(p_sponsor_name, '')), '');
  clean_sponsor_phone text := nullif(trim(coalesce(p_sponsor_phone, '')), '');
  clean_current_step text := nullif(trim(coalesce(p_current_step, '')), '');
  clean_signature_name text := nullif(trim(coalesce(p_roi_signature_name, '')), '');
  sponsor_contact_id uuid;
  effective_date date := current_date;
  expiration_date date := (current_date + interval '1 year' - interval '1 day')::date;
  approved_contacts_snapshot jsonb;
  authorization_text text;
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
    return jsonb_build_object(
      'ok', false,
      'message', 'Resident record could not be found.'
    );
  end if;

  if (clean_sponsor_name is not null or clean_sponsor_phone is not null) then
    if coalesce(p_roi_agreed, false) is not true then
      return jsonb_build_object(
        'ok', false,
        'message', 'Sponsor ROI authorization is required before saving sponsor information.'
      );
    end if;

    if clean_signature_name is null or length(clean_signature_name) < 2 then
      return jsonb_build_object(
        'ok', false,
        'message', 'Resident electronic signature is required for the sponsor ROI.'
      );
    end if;
  end if;

  update public.residents
  set
    sponsor_name = clean_sponsor_name,
    sponsor_phone = clean_sponsor_phone,
    current_step = clean_current_step,
    sponsor_info_updated_at = now()
  where id = resident_record.id;

  if clean_sponsor_name is not null then
    select id
    into sponsor_contact_id
    from public.resident_emergency_contacts
    where provider_id = resident_record.provider_id
      and resident_id = resident_record.id
      and contact_role = 'Chosen Sponsor'
      and status = 'active'
    order by created_at desc
    limit 1;

    if sponsor_contact_id is null then
      insert into public.resident_emergency_contacts (
        provider_id,
        resident_id,
        contact_name,
        contact_role,
        approved_for_roi,
        relationship,
        phone,
        email,
        address,
        is_primary,
        emergency_contact_authorized,
        roi_on_file,
        roi_signed_date,
        roi_expiration_date,
        roi_allows_emergency_contact,
        roi_allows_general_updates,
        roi_allows_billing_discussion,
        roi_allows_clinical_discussion,
        roi_restrictions,
        notes,
        status
      )
      values (
        resident_record.provider_id,
        resident_record.id,
        clean_sponsor_name,
        'Chosen Sponsor',
        true,
        'Sponsor',
        clean_sponsor_phone,
        null,
        null,
        false,
        false,
        true,
        effective_date,
        expiration_date,
        false,
        true,
        true,
        true,
        null,
        'Created from resident portal sponsor update.',
        'active'
      )
      returning id into sponsor_contact_id;
    else
      update public.resident_emergency_contacts
      set
        contact_name = clean_sponsor_name,
        phone = clean_sponsor_phone,
        approved_for_roi = true,
        relationship = 'Sponsor',
        roi_on_file = true,
        roi_signed_date = effective_date,
        roi_expiration_date = expiration_date,
        roi_allows_general_updates = true,
        roi_allows_billing_discussion = true,
        roi_allows_clinical_discussion = true,
        notes = coalesce(notes, 'Updated from resident portal sponsor update.')
      where id = sponsor_contact_id;
    end if;

    approved_contacts_snapshot := jsonb_build_array(
      jsonb_build_object(
        'id', sponsor_contact_id,
        'contact_name', clean_sponsor_name,
        'contact_role', 'Chosen Sponsor',
        'relationship', 'Sponsor',
        'phone', clean_sponsor_phone,
        'email', null
      )
    );

    authorization_text :=
      'Consent for Release of Information' || chr(10) || chr(10) ||
      'I, the undersigned resident, hereby authorize staff to disclose information to the individual listed below as my Chosen Sponsor.' || chr(10) || chr(10) ||
      'Approved Contacts List:' || chr(10) ||
      clean_sponsor_name || ' — Chosen Sponsor' || chr(10) || chr(10) ||
      'Scope of Disclosure' || chr(10) ||
      'I authorize disclosure of recovery plans, status updates or progress reports, progress notes, discharge planning and summaries, and financial status as applicable to my sponsor role and recovery support.' || chr(10) || chr(10) ||
      'Information will only be shared as necessary for coordination of care, safety, legal compliance, or recovery support.' || chr(10) || chr(10) ||
      'Duration of Authorization' || chr(10) ||
      'This authorization is valid for twelve (12) months from the date of signature unless revoked earlier in writing.' || chr(10) || chr(10) ||
      'Revocation of Consent' || chr(10) ||
      'I understand I may revoke this consent at any time by submitting a signed, written request. Revocation will not apply to information already disclosed prior to the date of revocation.' || chr(10) || chr(10) ||
      'Confidentiality Protections' || chr(10) ||
      'All shared information is protected under 42 CFR Part 2 and HIPAA. Re-disclosure is prohibited without further written consent except as specifically authorized by law.' || chr(10) || chr(10) ||
      'Resident Acknowledgment' || chr(10) ||
      'By signing below, I confirm that I have read and understand this Release of Information. I consent voluntarily and acknowledge that this ROI is consistent with the program Confidentiality Policy.' || chr(10) || chr(10) ||
      'Resident Signature Collected Electronically';

    insert into public.resident_roi_authorizations (
      provider_id,
      resident_id,
      emergency_contact_id,
      approved_contacts_snapshot,
      allows_recovery_plans,
      allows_status_updates,
      allows_progress_notes,
      allows_discharge_planning,
      allows_financial_status,
      effective_date,
      expiration_date,
      signature_text,
      signed_by_name,
      signature_method,
      authorization_text,
      status
    )
    values (
      resident_record.provider_id,
      resident_record.id,
      sponsor_contact_id,
      approved_contacts_snapshot,
      true,
      true,
      true,
      true,
      true,
      effective_date,
      expiration_date,
      clean_signature_name,
      clean_signature_name,
      'electronic_typed_signature',
      authorization_text,
      'active'
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'message', case
      when clean_sponsor_name is not null then 'Sponsor, step, and sponsor ROI information updated.'
      else 'Sponsor and step information updated.'
    end
  );
end;
$$;

grant execute on function public.update_client_portal_sponsor_info(text, text, text, text, boolean, text) to anon, authenticated;

notify pgrst, 'reload schema';
