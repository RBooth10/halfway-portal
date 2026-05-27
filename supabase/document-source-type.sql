-- Adds support for documents created inside the portal instead of only uploaded files.

alter table public.documents
add column if not exists document_source text not null default 'upload',
add column if not exists document_body text,
add column if not exists acknowledgment_statement text;
