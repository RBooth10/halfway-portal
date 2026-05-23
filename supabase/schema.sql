create extension if not exists pgcrypto;

create table if not exists providers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  dba_name text,
  primary_contact_name text,
  primary_contact_email text,
  primary_contact_phone text,
  website text,
  certification_status text default 'setup_needed',
  farr_level text,
  mat_mar_statement text,
  status text not null default 'setup',
  created_by_auth_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists houses (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  name text not null,
  street_address text,
  city text,
  state text,
  zip text,
  gender_served text,
  farr_level text,
  total_beds integer not null default 0 check (total_beds >= 0),
  status text not null default 'pending_setup',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff_profiles (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  auth_user_id uuid,
  first_name text,
  last_name text,
  email text not null,
  phone text,
  role text not null default 'pending',
  house_access text not null default 'none',
  status text not null default 'pending_approval',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists residents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  house_id uuid references houses(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  date_of_birth date,
  admission_date date,
  resident_status text not null default 'pending_admission',
  file_status text not null default 'needs_onboarding_packet',
  medication_status text not null default 'not_completed',
  rci_status text not null default 'not_started',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references providers(id) on delete cascade,
  house_id uuid references houses(id) on delete set null,
  resident_id uuid references residents(id) on delete set null,
  staff_profile_id uuid references staff_profiles(id) on delete set null,
  document_name text not null,
  category text not null,
  compliance_domain text,
  applies_to text,
  version_label text,
  effective_date date,
  status text not null default 'not_uploaded',
  file_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references providers(id) on delete cascade,
  actor_staff_profile_id uuid references staff_profiles(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_providers_created_by_auth_user_id on providers(created_by_auth_user_id);
create index if not exists idx_houses_provider_id on houses(provider_id);
create index if not exists idx_staff_profiles_provider_id on staff_profiles(provider_id);
create index if not exists idx_residents_provider_id on residents(provider_id);
create index if not exists idx_residents_house_id on residents(house_id);
create index if not exists idx_documents_provider_id on documents(provider_id);
create index if not exists idx_documents_house_id on documents(house_id);
create index if not exists idx_documents_resident_id on documents(resident_id);
create index if not exists idx_audit_logs_provider_id on audit_logs(provider_id);
