-- Resident ROI and emergency contact records.
-- Stores emergency contact details and release-of-information authorization.

create table if not exists public.resident_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  contact_name text not null,
  relationship text,
  phone text,
  email text,
  address text,
  is_primary boolean not null default false,
  emergency_contact_authorized boolean not null default true,
  roi_on_file boolean not null default false,
  roi_signed_date date,
  roi_expiration_date date,
  roi_allows_emergency_contact boolean not null default true,
  roi_allows_general_updates boolean not null default false,
  roi_allows_billing_discussion boolean not null default false,
  roi_allows_clinical_discussion boolean not null default false,
  roi_restrictions text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resident_emergency_contacts_provider_id
on public.resident_emergency_contacts(provider_id);

create index if not exists idx_resident_emergency_contacts_resident_id
on public.resident_emergency_contacts(resident_id);

alter table public.resident_emergency_contacts enable row level security;

drop policy if exists "Users can view resident emergency contacts for accessible providers" on public.resident_emergency_contacts;
drop policy if exists "Authorized users can create resident emergency contacts" on public.resident_emergency_contacts;
drop policy if exists "Authorized users can update resident emergency contacts" on public.resident_emergency_contacts;

create policy "Users can view resident emergency contacts for accessible providers"
on public.resident_emergency_contacts
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create resident emergency contacts"
on public.resident_emergency_contacts
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update resident emergency contacts"
on public.resident_emergency_contacts
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));
