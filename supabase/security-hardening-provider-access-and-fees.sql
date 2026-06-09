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
