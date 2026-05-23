-- Progress notes for resident profiles.

create table if not exists public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  author_auth_user_id uuid,
  note_type text not null default 'general',
  note_text text not null,
  visibility text not null default 'internal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_progress_notes_provider_id on public.progress_notes(provider_id);
create index if not exists idx_progress_notes_resident_id on public.progress_notes(resident_id);
create index if not exists idx_progress_notes_author_auth_user_id on public.progress_notes(author_auth_user_id);

alter table public.progress_notes enable row level security;

drop policy if exists "Users can view progress notes for accessible providers" on public.progress_notes;
drop policy if exists "Authorized users can create progress notes" on public.progress_notes;

create policy "Users can view progress notes for accessible providers"
on public.progress_notes
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create progress notes"
on public.progress_notes
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));
