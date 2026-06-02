-- Resident pass requests submitted from the persistent resident portal.

create table if not exists public.resident_pass_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  house_id uuid references public.houses(id) on delete set null,
  resident_id uuid not null references public.residents(id) on delete cascade,
  requested_departure_at timestamptz not null,
  requested_return_at timestamptz not null,
  destination text not null,
  reason text,
  transportation_plan text,
  emergency_contact_plan text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'cancelled', 'completed')),
  provider_notes text,
  reviewed_by_auth_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resident_pass_requests_return_after_departure
    check (requested_return_at > requested_departure_at)
);

create index if not exists idx_resident_pass_requests_provider_id
on public.resident_pass_requests(provider_id);

create index if not exists idx_resident_pass_requests_resident_id
on public.resident_pass_requests(resident_id);

create index if not exists idx_resident_pass_requests_house_id
on public.resident_pass_requests(house_id);

create index if not exists idx_resident_pass_requests_status
on public.resident_pass_requests(status);

alter table public.resident_pass_requests enable row level security;

drop policy if exists "Users can view pass requests for accessible providers"
on public.resident_pass_requests;

drop policy if exists "Authorized users can update pass requests"
on public.resident_pass_requests;

create policy "Users can view pass requests for accessible providers"
on public.resident_pass_requests
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can update pass requests"
on public.resident_pass_requests
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

create or replace function public.submit_client_portal_pass_request(
  p_access_token text,
  p_requested_departure_at timestamptz,
  p_requested_return_at timestamptz,
  p_destination text,
  p_reason text,
  p_transportation_plan text,
  p_emergency_contact_plan text
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
  clean_reason text := nullif(trim(coalesce(p_reason, '')), '');
  clean_transportation text := nullif(trim(coalesce(p_transportation_plan, '')), '');
  clean_emergency_plan text := nullif(trim(coalesce(p_emergency_contact_plan, '')), '');
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

  if clean_destination = '' then
    return jsonb_build_object('ok', false, 'message', 'Destination is required.');
  end if;

  if p_requested_departure_at is null or p_requested_return_at is null then
    return jsonb_build_object('ok', false, 'message', 'Departure and return times are required.');
  end if;

  if p_requested_return_at <= p_requested_departure_at then
    return jsonb_build_object('ok', false, 'message', 'Return time must be after departure time.');
  end if;

  insert into public.resident_pass_requests (
    provider_id,
    house_id,
    resident_id,
    requested_departure_at,
    requested_return_at,
    destination,
    reason,
    transportation_plan,
    emergency_contact_plan,
    status
  )
  values (
    link_record.provider_id,
    coalesce(link_record.house_id, resident_record.house_id),
    resident_record.id,
    p_requested_departure_at,
    p_requested_return_at,
    clean_destination,
    clean_reason,
    clean_transportation,
    clean_emergency_plan,
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

grant execute on function public.submit_client_portal_pass_request(text, timestamptz, timestamptz, text, text, text, text) to anon, authenticated;
