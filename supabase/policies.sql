-- Temporary development policies.
-- These allow the early browser-based setup workflow to create and read records.
-- Tighten these before using real resident, staff, or provider data.

alter table public.providers enable row level security;
alter table public.houses enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.residents enable row level security;
alter table public.documents enable row level security;

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

drop policy if exists "Allow house setup inserts" on public.houses;
drop policy if exists "Allow house setup reads" on public.houses;

create policy "Allow house setup inserts"
on public.houses
for insert
to anon, authenticated
with check (true);

create policy "Allow house setup reads"
on public.houses
for select
to anon, authenticated
using (true);

drop policy if exists "Allow staff setup inserts" on public.staff_profiles;
drop policy if exists "Allow staff setup reads" on public.staff_profiles;

create policy "Allow staff setup inserts"
on public.staff_profiles
for insert
to anon, authenticated
with check (true);

create policy "Allow staff setup reads"
on public.staff_profiles
for select
to anon, authenticated
using (true);

drop policy if exists "Allow resident setup inserts" on public.residents;
drop policy if exists "Allow resident setup reads" on public.residents;

create policy "Allow resident setup inserts"
on public.residents
for insert
to anon, authenticated
with check (true);

create policy "Allow resident setup reads"
on public.residents
for select
to anon, authenticated
using (true);

drop policy if exists "Allow document setup inserts" on public.documents;
drop policy if exists "Allow document setup reads" on public.documents;

create policy "Allow document setup inserts"
on public.documents
for insert
to anon, authenticated
with check (true);

create policy "Allow document setup reads"
on public.documents
for select
to anon, authenticated
using (true);
