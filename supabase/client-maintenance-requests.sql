-- Client-facing maintenance request links.
-- Allows residents to submit maintenance requests without requiring resident portal login.

create table if not exists public.resident_maintenance_request_links (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  house_id uuid references public.houses(id) on delete set null,
  created_by_auth_user_id uuid references auth.users(id) on delete set null,
  access_token text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_resident_maintenance_request_links_provider_id
on public.resident_maintenance_request_links(provider_id);

create index if not exists idx_resident_maintenance_request_links_resident_id
on public.resident_maintenance_request_links(resident_id);

create index if not exists idx_resident_maintenance_request_links_access_token
on public.resident_maintenance_request_links(access_token);

alter table public.resident_maintenance_request_links enable row level security;

drop policy if exists "Users can view maintenance request links for accessible providers"
on public.resident_maintenance_request_links;

drop policy if exists "Authorized users can create maintenance request links"
on public.resident_maintenance_request_links;

create policy "Users can view maintenance request links for accessible providers"
on public.resident_maintenance_request_links
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create maintenance request links"
on public.resident_maintenance_request_links
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create or replace function public.get_client_maintenance_context(p_access_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  link_record public.resident_maintenance_request_links%rowtype;
  resident_record public.residents%rowtype;
  house_record public.houses%rowtype;
begin
  select *
  into link_record
  from public.resident_maintenance_request_links
  where access_token = p_access_token
    and access_token is not null
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'This maintenance request link is invalid or expired.'
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

  if link_record.house_id is not null then
    select *
    into house_record
    from public.houses
    where id = link_record.house_id
    limit 1;
  elsif resident_record.house_id is not null then
    select *
    into house_record
    from public.houses
    where id = resident_record.house_id
    limit 1;
  end if;

  return jsonb_build_object(
    'ok', true,
    'resident_name', concat_ws(' ', resident_record.first_name, resident_record.last_name),
    'house_name', house_record.name
  );
end;
$$;

create or replace function public.submit_client_maintenance_request(
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
  link_record public.resident_maintenance_request_links%rowtype;
  resident_record public.residents%rowtype;
  clean_title text := trim(coalesce(p_request_title, ''));
  clean_description text := trim(coalesce(p_request_description, ''));
  clean_location text := nullif(trim(coalesce(p_location_area, '')), '');
  clean_priority text := lower(trim(coalesce(p_priority, 'normal')));
  request_id uuid;
begin
  select *
  into link_record
  from public.resident_maintenance_request_links
  where access_token = p_access_token
    and access_token is not null
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'This maintenance request link is invalid or expired.'
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

grant execute on function public.get_client_maintenance_context(text) to anon, authenticated;
grant execute on function public.submit_client_maintenance_request(text, text, text, text, text) to anon, authenticated;
