-- Client-facing intake document signing.
-- Allows staff to generate a secure resident intake signing link without requiring resident portal login.

create table if not exists public.resident_intake_signing_links (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  created_by_auth_user_id uuid references auth.users(id) on delete set null,
  access_token text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_resident_intake_signing_links_provider_id
  on public.resident_intake_signing_links(provider_id);

create index if not exists idx_resident_intake_signing_links_resident_id
  on public.resident_intake_signing_links(resident_id);

create index if not exists idx_resident_intake_signing_links_access_token
  on public.resident_intake_signing_links(access_token);

alter table public.resident_intake_signing_links enable row level security;

drop policy if exists "Users can view intake signing links for accessible providers" on public.resident_intake_signing_links;
drop policy if exists "Authorized users can create intake signing links" on public.resident_intake_signing_links;

create policy "Users can view intake signing links for accessible providers"
on public.resident_intake_signing_links
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create intake signing links"
on public.resident_intake_signing_links
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create or replace function public.get_client_intake_documents(p_access_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  link_record public.resident_intake_signing_links%rowtype;
  resident_record public.residents%rowtype;
  document_data jsonb;
begin
  select *
  into link_record
  from public.resident_intake_signing_links
  where access_token = p_access_token
    and access_token is not null
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'This intake document link is invalid or expired.'
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
      'message', 'Resident record was not found.'
    );
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
      'file_url', d.file_url,
      'notes', d.notes
    )
    order by d.document_name
  )
  into document_data
  from public.resident_document_assignments rda
  join public.documents d on d.id = rda.document_id
  where rda.resident_id = link_record.resident_id
    and rda.signature_required_from = 'resident'
    and rda.assignment_status <> 'archived';

  return jsonb_build_object(
    'ok', true,
    'resident_id', resident_record.id,
    'resident_name', concat_ws(' ', resident_record.first_name, resident_record.last_name),
    'documents', coalesce(document_data, '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_client_intake_signature(
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
  link_record public.resident_intake_signing_links%rowtype;
  assignment_record public.resident_document_assignments%rowtype;
begin
  select *
  into link_record
  from public.resident_intake_signing_links
  where access_token = p_access_token
    and access_token is not null
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'This intake document link is invalid or expired.'
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

  update public.resident_document_assignments
  set
    signature_status = 'signed',
    signed_by_name = trim(p_signed_by_name),
    signed_at = now(),
    signature_method = 'electronic_typed_signature',
    assignment_status = 'completed',
    updated_at = now()
  where id = assignment_record.id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Document signed successfully.'
  );
end;
$$;

grant execute on function public.get_client_intake_documents(text) to anon, authenticated;
grant execute on function public.submit_client_intake_signature(text, uuid, text) to anon, authenticated;
