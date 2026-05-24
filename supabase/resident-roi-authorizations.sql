-- Resident ROI authorizations.
-- A signed ROI covers the resident's approved contacts list.

alter table public.resident_emergency_contacts
add column if not exists contact_role text not null default 'Emergency Contact',
add column if not exists approved_for_roi boolean not null default true;

create table if not exists public.resident_roi_authorizations (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  authorization_title text not null default 'Consent for Release of Information',
  approved_contacts_snapshot jsonb not null default '[]'::jsonb,
  allows_recovery_plans boolean not null default true,
  allows_status_updates boolean not null default true,
  allows_progress_notes boolean not null default true,
  allows_discharge_planning boolean not null default true,
  allows_financial_status boolean not null default true,
  effective_date date not null default current_date,
  expiration_date date not null default (current_date + interval '12 months')::date,
  revoked_at timestamptz,
  revocation_notes text,
  signature_text text not null,
  signed_by_name text not null,
  signed_at timestamptz not null default now(),
  signature_method text not null default 'electronic_typed_signature',
  authorization_text text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resident_roi_authorizations_provider_id
on public.resident_roi_authorizations(provider_id);

create index if not exists idx_resident_roi_authorizations_resident_id
on public.resident_roi_authorizations(resident_id);

alter table public.resident_roi_authorizations enable row level security;

drop policy if exists "Users can view resident ROI authorizations for accessible providers" on public.resident_roi_authorizations;
drop policy if exists "Authorized users can create resident ROI authorizations" on public.resident_roi_authorizations;
drop policy if exists "Authorized users can update resident ROI authorizations" on public.resident_roi_authorizations;

create policy "Users can view resident ROI authorizations for accessible providers"
on public.resident_roi_authorizations
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create resident ROI authorizations"
on public.resident_roi_authorizations
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update resident ROI authorizations"
on public.resident_roi_authorizations
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));
