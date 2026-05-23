-- Secure provider-specific RLS policies.
-- This version avoids recursive staff_profiles policies by using SECURITY DEFINER helper functions.

-- Required before running:
-- 1. Supabase Auth is working.
-- 2. providers.created_by_auth_user_id exists.
-- 3. At least one provider is owned by the signed-in user OR the signed-in user has a linked staff profile.
-- 4. staff_profiles.auth_user_id is filled in for the signed-in user.

alter table public.providers enable row level security;
alter table public.houses enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.residents enable row level security;
alter table public.documents enable row level security;

-- Helper functions.
-- These run as SECURITY DEFINER so policy checks do not recursively trigger RLS on staff_profiles.

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
      and sp.role in ('owner_admin', 'compliance_manager', 'house_manager')
  );
$$;

-- Make helper functions callable by authenticated users.
-- They only return booleans and do not expose table rows directly.

grant execute on function public.current_user_has_provider_access(uuid) to authenticated;
grant execute on function public.current_user_can_manage_provider(uuid) to authenticated;
grant execute on function public.current_user_can_manage_house_records(uuid) to authenticated;

-- Drop temporary development policies.

drop policy if exists "Allow provider setup inserts" on public.providers;
drop policy if exists "Allow provider setup reads" on public.providers;

drop policy if exists "Allow house setup inserts" on public.houses;
drop policy if exists "Allow house setup reads" on public.houses;

drop policy if exists "Allow staff setup inserts" on public.staff_profiles;
drop policy if exists "Allow staff setup reads" on public.staff_profiles;
drop policy if exists "Allow staff setup updates" on public.staff_profiles;

drop policy if exists "Allow resident setup inserts" on public.residents;
drop policy if exists "Allow resident setup reads" on public.residents;

drop policy if exists "Allow document setup inserts" on public.documents;
drop policy if exists "Allow document setup reads" on public.documents;

-- Drop old secure policies if they exist.

drop policy if exists "Users can create providers they own" on public.providers;
drop policy if exists "Users can view their provider records" on public.providers;
drop policy if exists "Provider owners can update their provider records" on public.providers;

drop policy if exists "Users can view staff profiles for their provider" on public.staff_profiles;
drop policy if exists "Provider owners can create staff profiles" on public.staff_profiles;
drop policy if exists "Provider owners can update staff profiles" on public.staff_profiles;

drop policy if exists "Users can view houses for their provider" on public.houses;
drop policy if exists "Authorized users can create houses" on public.houses;
drop policy if exists "Authorized users can update houses" on public.houses;

drop policy if exists "Users can view residents for their provider" on public.residents;
drop policy if exists "Authorized users can create residents" on public.residents;
drop policy if exists "Authorized users can update residents" on public.residents;

drop policy if exists "Users can view documents for their provider" on public.documents;
drop policy if exists "Authorized users can create documents" on public.documents;
drop policy if exists "Authorized users can update documents" on public.documents;

-- Providers

create policy "Users can create providers they own"
on public.providers
for insert
to authenticated
with check (created_by_auth_user_id = auth.uid());

create policy "Users can view accessible providers"
on public.providers
for select
to authenticated
using (
  created_by_auth_user_id = auth.uid()
  or public.current_user_has_provider_access(id)
);

create policy "Provider managers can update providers"
on public.providers
for update
to authenticated
using (public.current_user_can_manage_provider(id))
with check (public.current_user_can_manage_provider(id));

-- Staff profiles

create policy "Users can view accessible staff profiles"
on public.staff_profiles
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.current_user_has_provider_access(provider_id)
);

create policy "Provider managers can create staff profiles"
on public.staff_profiles
for insert
to authenticated
with check (public.current_user_can_manage_provider(provider_id));

create policy "Provider managers can update staff profiles"
on public.staff_profiles
for update
to authenticated
using (
  auth_user_id = auth.uid()
  or public.current_user_can_manage_provider(provider_id)
)
with check (
  auth_user_id = auth.uid()
  or public.current_user_can_manage_provider(provider_id)
);

-- Houses

create policy "Users can view accessible houses"
on public.houses
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create houses"
on public.houses
for insert
to authenticated
with check (public.current_user_can_manage_provider(provider_id));

create policy "Authorized users can update houses"
on public.houses
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

-- Residents

create policy "Users can view accessible residents"
on public.residents
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create residents"
on public.residents
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update residents"
on public.residents
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

-- Documents

create policy "Users can view accessible documents"
on public.documents
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create documents"
on public.documents
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update documents"
on public.documents
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));
