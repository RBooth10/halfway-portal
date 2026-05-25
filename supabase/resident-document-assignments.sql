create table if not exists public.resident_document_assignments (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  assignment_status text not null default 'assigned',
  signature_status text not null default 'not_sent',
  signature_required_from text not null default 'resident',
  signature_instructions text,
  signed_by_name text,
  signed_at timestamptz,
  signature_method text,
  signed_file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(resident_id, document_id)
);

create index if not exists idx_resident_document_assignments_provider_id
  on public.resident_document_assignments(provider_id);

create index if not exists idx_resident_document_assignments_resident_id
  on public.resident_document_assignments(resident_id);

create index if not exists idx_resident_document_assignments_document_id
  on public.resident_document_assignments(document_id);

create index if not exists idx_resident_document_assignments_signature_status
  on public.resident_document_assignments(signature_status);
