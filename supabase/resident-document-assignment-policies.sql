alter table public.resident_document_assignments enable row level security;

drop policy if exists "Allow resident document assignment read access" on public.resident_document_assignments;
drop policy if exists "Allow resident document assignment insert access" on public.resident_document_assignments;
drop policy if exists "Allow resident document assignment update access" on public.resident_document_assignments;
drop policy if exists "Allow resident document assignment delete access" on public.resident_document_assignments;

create policy "Allow resident document assignment read access"
on public.resident_document_assignments
for select
to public
using (true);

create policy "Allow resident document assignment insert access"
on public.resident_document_assignments
for insert
to public
with check (true);

create policy "Allow resident document assignment update access"
on public.resident_document_assignments
for update
to public
using (true)
with check (true);

create policy "Allow resident document assignment delete access"
on public.resident_document_assignments
for delete
to public
using (true);
