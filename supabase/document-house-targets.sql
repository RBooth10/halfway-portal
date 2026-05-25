-- Resident Packet document targeting.
-- Allows a signable resident document to be sent to all residents or only selected houses.

alter table public.documents
  add column if not exists resident_send_scope text not null default 'all_residents';

create table if not exists public.document_house_targets (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  house_id uuid not null references public.houses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(document_id, house_id)
);

create index if not exists idx_document_house_targets_provider_id
  on public.document_house_targets(provider_id);

create index if not exists idx_document_house_targets_document_id
  on public.document_house_targets(document_id);

create index if not exists idx_document_house_targets_house_id
  on public.document_house_targets(house_id);

alter table public.document_house_targets enable row level security;

drop policy if exists "Users can view document house targets for accessible providers" on public.document_house_targets;
drop policy if exists "Authorized users can create document house targets" on public.document_house_targets;
drop policy if exists "Authorized users can update document house targets" on public.document_house_targets;
drop policy if exists "Authorized users can delete document house targets" on public.document_house_targets;

create policy "Users can view document house targets for accessible providers"
on public.document_house_targets
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create document house targets"
on public.document_house_targets
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update document house targets"
on public.document_house_targets
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can delete document house targets"
on public.document_house_targets
for delete
to authenticated
using (public.current_user_can_manage_house_records(provider_id));
