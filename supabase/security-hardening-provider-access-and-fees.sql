-- Security hardening: provider access, resident document assignments, staff/admin RPC permissions, and fee-charge indexes.

-- 1. Provider access helpers must only count active staff.
create or replace function public.current_user_has_provider_access(target_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.providers p
    where p.id = target_provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = target_provider_id
      and sp.auth_user_id = auth.uid()
      and sp.status = 'active'
  );
$$;

create or replace function public.current_user_can_manage_provider(target_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.providers p
    where p.id = target_provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = target_provider_id
      and sp.auth_user_id = auth.uid()
      and sp.status = 'active'
      and sp.role in ('owner_admin', 'compliance_manager')
  );
$$;

create or replace function public.current_user_can_manage_house_records(target_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.providers p
    where p.id = target_provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = target_provider_id
      and sp.auth_user_id = auth.uid()
      and sp.status = 'active'
      and sp.role in ('owner_admin', 'compliance_manager', 'house_manager')
  );
$$;

-- 2. Tighten resident document assignment policies.
alter table public.resident_document_assignments enable row level security;

drop policy if exists "Allow resident document assignment read access" on public.resident_document_assignments;
drop policy if exists "Allow resident document assignment insert access" on public.resident_document_assignments;
drop policy if exists "Allow resident document assignment update access" on public.resident_document_assignments;
drop policy if exists "Allow resident document assignment delete access" on public.resident_document_assignments;

drop policy if exists "Users can view resident document assignments for accessible providers" on public.resident_document_assignments;
drop policy if exists "Authorized users can create resident document assignments" on public.resident_document_assignments;
drop policy if exists "Authorized users can update resident document assignments" on public.resident_document_assignments;
drop policy if exists "Authorized users can delete resident document assignments" on public.resident_document_assignments;

create policy "Users can view resident document assignments for accessible providers"
on public.resident_document_assignments
for select
to authenticated
using (
  public.current_user_has_provider_access(provider_id)
);

create policy "Authorized users can create resident document assignments"
on public.resident_document_assignments
for insert
to authenticated
with check (
  public.current_user_can_manage_house_records(provider_id)
);

create policy "Authorized users can update resident document assignments"
on public.resident_document_assignments
for update
to authenticated
using (
  public.current_user_can_manage_house_records(provider_id)
)
with check (
  public.current_user_can_manage_house_records(provider_id)
);

create policy "Authorized users can delete resident document assignments"
on public.resident_document_assignments
for delete
to authenticated
using (
  public.current_user_can_manage_house_records(provider_id)
);

-- 3. Staff/admin RPC functions should not be executable by anonymous users.
revoke all privileges on function public.current_user_has_provider_access(uuid) from public;
revoke all privileges on function public.current_user_can_manage_provider(uuid) from public;
revoke all privileges on function public.current_user_can_manage_house_records(uuid) from public;

revoke all privileges on function public.create_staff_maintenance_request(jsonb) from public;
revoke all privileges on function public.create_staff_maintenance_request(uuid, uuid, uuid, text, text, text, text, text) from public;

revoke all privileges on function public.discharge_resident(uuid, date, text, text, uuid[]) from public;
revoke all privileges on function public.readmit_resident(uuid, date, uuid, boolean, text) from public;
revoke all privileges on function public.record_resident_payment(uuid, uuid, numeric, text, text, text) from public;
revoke all privileges on function public.ensure_current_resident_fees(uuid) from public;
revoke all privileges on function public.ensure_provider_rolling_ua_schedule(uuid, integer, integer, integer) from public;
revoke all privileges on function public.ensure_resident_rolling_ua_schedule(uuid, integer, integer, integer) from public;

grant execute on function public.current_user_has_provider_access(uuid) to authenticated;
grant execute on function public.current_user_can_manage_provider(uuid) to authenticated;
grant execute on function public.current_user_can_manage_house_records(uuid) to authenticated;

grant execute on function public.create_staff_maintenance_request(jsonb) to authenticated;
grant execute on function public.create_staff_maintenance_request(uuid, uuid, uuid, text, text, text, text, text) to authenticated;

grant execute on function public.discharge_resident(uuid, date, text, text, uuid[]) to authenticated;
grant execute on function public.readmit_resident(uuid, date, uuid, boolean, text) to authenticated;
grant execute on function public.record_resident_payment(uuid, uuid, numeric, text, text, text) to authenticated;
grant execute on function public.ensure_current_resident_fees(uuid) to authenticated;
grant execute on function public.ensure_provider_rolling_ua_schedule(uuid, integer, integer, integer) to authenticated;
grant execute on function public.ensure_resident_rolling_ua_schedule(uuid, integer, integer, integer) to authenticated;

-- 4. Fee-charge performance indexes.
create index if not exists resident_fee_charges_provider_resident_status_due_idx
on public.resident_fee_charges (provider_id, resident_id, status, due_date);

create index if not exists resident_fee_charges_resident_due_created_idx
on public.resident_fee_charges (resident_id, due_date desc, created_at desc);

-- Keep existing idx_resident_fee_charges_provider_due_created and avoid duplicate provider/due/created index.
drop index if exists public.resident_fee_charges_provider_due_created_idx;

analyze public.resident_fee_charges;

-- 5. Internal trigger functions should not be directly executable through /rest/v1/rpc.
revoke all privileges on function public.set_new_resident_phase_one() from public;
revoke all privileges on function public.sync_resident_rolling_ua_schedule() from public;

revoke execute on function public.set_new_resident_phase_one() from anon;
revoke execute on function public.sync_resident_rolling_ua_schedule() from anon;

revoke execute on function public.set_new_resident_phase_one() from authenticated;
revoke execute on function public.sync_resident_rolling_ua_schedule() from authenticated;

-- 6. Legacy resident pass request RPC is no longer used by the app.
-- The app uses submit_client_portal_pass_request_v2(jsonb), which remains executable for token-based resident portal links.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'submit_client_portal_pass_request'
  loop
    execute format('revoke all privileges on function %s from public', fn.function_signature);
    execute format('revoke execute on function %s from anon', fn.function_signature);
    execute format('revoke execute on function %s from authenticated', fn.function_signature);
  end loop;
end $$;

-- 6. Legacy resident pass request RPC is no longer used by the app.
-- The app uses submit_client_portal_pass_request_v2(jsonb), which remains executable for token-based resident portal links.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'submit_client_portal_pass_request'
  loop
    execute format('revoke all privileges on function %s from public', fn.function_signature);
    execute format('revoke execute on function %s from anon', fn.function_signature);
    execute format('revoke execute on function %s from authenticated', fn.function_signature);
  end loop;
end $$;

-- 7. Client RCI recovery goals must respect the RCI client link expiration.
create or replace function public.submit_client_recovery_goals(
  p_access_token text,
  p_goals jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  assessment_record public.rci_assessments%rowtype;
  goal_record record;
  inserted_count integer := 0;
begin
  select *
  into assessment_record
  from public.rci_assessments
  where client_access_token = p_access_token
    and client_access_token is not null
    and status = 'completed'
    and (client_link_expires_at is null or client_link_expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Recovery goals can only be submitted after a completed assessment with an active link.'
    );
  end if;

  for goal_record in
    select *
    from jsonb_to_recordset(p_goals)
      as x(goal_area text, goal_text text, action_steps text, supports_needed text, priority text)
  loop
    if nullif(trim(goal_record.goal_text), '') is not null then
      insert into public.recovery_goals (
        provider_id,
        resident_id,
        rci_assessment_id,
        created_by_source,
        goal_area,
        goal_text,
        action_steps,
        supports_needed,
        priority,
        status
      )
      values (
        assessment_record.provider_id,
        assessment_record.resident_id,
        assessment_record.id,
        'resident_client',
        coalesce(nullif(trim(goal_record.goal_area), ''), 'personal_capital'),
        trim(goal_record.goal_text),
        nullif(trim(coalesce(goal_record.action_steps, '')), ''),
        nullif(trim(coalesce(goal_record.supports_needed, '')), ''),
        coalesce(nullif(trim(goal_record.priority), ''), 'medium'),
        'active'
      );

      inserted_count := inserted_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'inserted_count', inserted_count,
    'message', 'Recovery goals submitted successfully.'
  );
end;
$function$;

revoke all privileges on function public.submit_client_recovery_goals(text, jsonb) from public;
grant execute on function public.submit_client_recovery_goals(text, jsonb) to anon, authenticated;

-- 8. Staff maintenance RPCs must reject cross-provider house/resident IDs.
create or replace function public.create_staff_maintenance_request(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  provider_uuid uuid := nullif(p_payload ->> 'provider_id', '')::uuid;
  house_uuid uuid := nullif(p_payload ->> 'house_id', '')::uuid;
  resident_uuid uuid := nullif(p_payload ->> 'resident_id', '')::uuid;
  resident_record public.residents%rowtype;
  house_record public.houses%rowtype;
  clean_title text := trim(coalesce(p_payload ->> 'request_title', ''));
  clean_description text := trim(coalesce(p_payload ->> 'request_description', ''));
  clean_location text := nullif(trim(coalesce(p_payload ->> 'location_area', '')), '');
  clean_priority text := lower(trim(coalesce(p_payload ->> 'priority', 'normal')));
  clean_notes text := nullif(trim(coalesce(p_payload ->> 'provider_notes', '')), '');
  request_id uuid;
begin
  if provider_uuid is null then
    return jsonb_build_object('ok', false, 'message', 'Provider is required.');
  end if;

  if not public.current_user_can_manage_house_records(provider_uuid) then
    return jsonb_build_object('ok', false, 'message', 'Not authorized to create maintenance requests.');
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

  if house_uuid is not null then
    select *
    into house_record
    from public.houses
    where id = house_uuid
      and provider_id = provider_uuid
    limit 1;

    if not found then
      return jsonb_build_object('ok', false, 'message', 'House was not found for this provider.');
    end if;
  end if;

  if resident_uuid is not null then
    select *
    into resident_record
    from public.residents
    where id = resident_uuid
      and provider_id = provider_uuid
    limit 1;

    if not found then
      return jsonb_build_object('ok', false, 'message', 'Resident was not found for this provider.');
    end if;
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
    status,
    provider_notes
  )
  values (
    provider_uuid,
    coalesce(house_uuid, resident_record.house_id),
    resident_uuid,
    case
      when resident_uuid is not null
        then concat_ws(' ', resident_record.first_name, resident_record.last_name)
      else 'Staff entry'
    end,
    clean_title,
    clean_description,
    clean_location,
    clean_priority,
    'open',
    clean_notes
  )
  returning id into request_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Maintenance request created.',
    'request_id', request_id
  );
exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'message', SQLERRM
    );
end;
$function$;


create or replace function public.create_staff_maintenance_request(
  p_provider_id uuid,
  p_house_id uuid,
  p_resident_id uuid,
  p_request_title text,
  p_request_description text,
  p_location_area text,
  p_priority text,
  p_provider_notes text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  resident_record public.residents%rowtype;
  house_record public.houses%rowtype;
  clean_title text := trim(coalesce(p_request_title, ''));
  clean_description text := trim(coalesce(p_request_description, ''));
  clean_location text := nullif(trim(coalesce(p_location_area, '')), '');
  clean_priority text := lower(trim(coalesce(p_priority, 'normal')));
  clean_notes text := nullif(trim(coalesce(p_provider_notes, '')), '');
  request_id uuid;
begin
  if p_provider_id is null then
    return jsonb_build_object('ok', false, 'message', 'Provider is required.');
  end if;

  if not public.current_user_can_manage_house_records(p_provider_id) then
    return jsonb_build_object('ok', false, 'message', 'Not authorized to create maintenance requests.');
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

  if p_house_id is not null then
    select *
    into house_record
    from public.houses
    where id = p_house_id
      and provider_id = p_provider_id
    limit 1;

    if not found then
      return jsonb_build_object('ok', false, 'message', 'House was not found for this provider.');
    end if;
  end if;

  if p_resident_id is not null then
    select *
    into resident_record
    from public.residents
    where id = p_resident_id
      and provider_id = p_provider_id
    limit 1;

    if not found then
      return jsonb_build_object('ok', false, 'message', 'Resident was not found for this provider.');
    end if;
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
    status,
    provider_notes
  )
  values (
    p_provider_id,
    coalesce(p_house_id, resident_record.house_id),
    p_resident_id,
    case
      when p_resident_id is not null
        then concat_ws(' ', resident_record.first_name, resident_record.last_name)
      else 'Staff entry'
    end,
    clean_title,
    clean_description,
    clean_location,
    clean_priority,
    'open',
    clean_notes
  )
  returning id into request_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Maintenance request created.',
    'request_id', request_id
  );
end;
$function$;

revoke all privileges on function public.create_staff_maintenance_request(jsonb) from public;
revoke all privileges on function public.create_staff_maintenance_request(uuid, uuid, uuid, text, text, text, text, text) from public;

grant execute on function public.create_staff_maintenance_request(jsonb) to authenticated;
grant execute on function public.create_staff_maintenance_request(uuid, uuid, uuid, text, text, text, text, text) to authenticated;
