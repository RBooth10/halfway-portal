-- Secure provider-specific RLS policies.
-- Run this after:
-- 1. Supabase Auth is working.
-- 2. providers.created_by_auth_user_id exists.
-- 3. Your signed-in user has created or is linked to the provider.
-- 4. Your staff profile has auth_user_id filled in if using staff-based access.

alter table public.providers enable row level security;
alter table public.houses enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.residents enable row level security;
alter table public.documents enable row level security;

-- Remove temporary development policies.

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

-- Providers

create policy "Users can create providers they own"
on public.providers
for insert
to authenticated
with check (created_by_auth_user_id = auth.uid());

create policy "Users can view their provider records"
on public.providers
for select
to authenticated
using (
  created_by_auth_user_id = auth.uid()
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = providers.id
      and sp.auth_user_id = auth.uid()
  )
);

create policy "Provider owners can update their provider records"
on public.providers
for update
to authenticated
using (
  created_by_auth_user_id = auth.uid()
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = providers.id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager')
  )
)
with check (
  created_by_auth_user_id = auth.uid()
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = providers.id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager')
  )
);

-- Staff profiles

create policy "Users can view staff profiles for their provider"
on public.staff_profiles
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or exists (
    select 1
    from public.providers p
    where p.id = staff_profiles.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = staff_profiles.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager')
  )
);

create policy "Provider owners can create staff profiles"
on public.staff_profiles
for insert
to authenticated
with check (
  exists (
    select 1
    from public.providers p
    where p.id = staff_profiles.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = staff_profiles.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager')
  )
);

create policy "Provider owners can update staff profiles"
on public.staff_profiles
for update
to authenticated
using (
  auth_user_id = auth.uid()
  or exists (
    select 1
    from public.providers p
    where p.id = staff_profiles.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = staff_profiles.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager')
  )
)
with check (
  auth_user_id = auth.uid()
  or exists (
    select 1
    from public.providers p
    where p.id = staff_profiles.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = staff_profiles.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager')
  )
);

-- Houses

create policy "Users can view houses for their provider"
on public.houses
for select
to authenticated
using (
  exists (
    select 1
    from public.providers p
    where p.id = houses.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = houses.provider_id
      and sp.auth_user_id = auth.uid()
  )
);

create policy "Authorized users can create houses"
on public.houses
for insert
to authenticated
with check (
  exists (
    select 1
    from public.providers p
    where p.id = houses.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = houses.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager')
  )
);

create policy "Authorized users can update houses"
on public.houses
for update
to authenticated
using (
  exists (
    select 1
    from public.providers p
    where p.id = houses.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = houses.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager', 'house_manager')
  )
)
with check (
  exists (
    select 1
    from public.providers p
    where p.id = houses.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = houses.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager', 'house_manager')
  )
);

-- Residents

create policy "Users can view residents for their provider"
on public.residents
for select
to authenticated
using (
  exists (
    select 1
    from public.providers p
    where p.id = residents.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = residents.provider_id
      and sp.auth_user_id = auth.uid()
  )
);

create policy "Authorized users can create residents"
on public.residents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.providers p
    where p.id = residents.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = residents.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager', 'house_manager')
  )
);

create policy "Authorized users can update residents"
on public.residents
for update
to authenticated
using (
  exists (
    select 1
    from public.providers p
    where p.id = residents.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = residents.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager', 'house_manager')
  )
)
with check (
  exists (
    select 1
    from public.providers p
    where p.id = residents.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = residents.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager', 'house_manager')
  )
);

-- Documents

create policy "Users can view documents for their provider"
on public.documents
for select
to authenticated
using (
  exists (
    select 1
    from public.providers p
    where p.id = documents.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = documents.provider_id
      and sp.auth_user_id = auth.uid()
  )
);

create policy "Authorized users can create documents"
on public.documents
for insert
to authenticated
with check (
  exists (
    select 1
    from public.providers p
    where p.id = documents.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = documents.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager', 'house_manager')
  )
);

create policy "Authorized users can update documents"
on public.documents
for update
to authenticated
using (
  exists (
    select 1
    from public.providers p
    where p.id = documents.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = documents.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager', 'house_manager')
  )
)
with check (
  exists (
    select 1
    from public.providers p
    where p.id = documents.provider_id
      and p.created_by_auth_user_id = auth.uid()
  )
  or exists (
    select 1
    from public.staff_profiles sp
    where sp.provider_id = documents.provider_id
      and sp.auth_user_id = auth.uid()
      and sp.role in ('owner_admin', 'compliance_manager', 'house_manager')
  )
);
