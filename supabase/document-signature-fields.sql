alter table public.documents
  add column if not exists is_signable boolean not null default false,
  add column if not exists signature_required_from text not null default 'not_required',
  add column if not exists signature_status text not null default 'not_required',
  add column if not exists signature_instructions text,
  add column if not exists signed_file_url text,
  add column if not exists signed_at timestamptz;

create index if not exists idx_documents_signature_status
  on public.documents(signature_status);

create index if not exists idx_documents_is_signable
  on public.documents(is_signable);
