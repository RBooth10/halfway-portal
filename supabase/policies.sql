-- Temporary setup policies for early development.
-- Tighten these before using real provider or resident data.

alter table public.providers enable row level security;

drop policy if exists "Allow provider setup inserts" on public.providers;
drop policy if exists "Allow provider setup reads" on public.providers;

create policy "Allow provider setup inserts"
on public.providers
for insert
to anon, authenticated
with check (true);

create policy "Allow provider setup reads"
on public.providers
for select
to anon, authenticated
using (true);
