-- Private storage bucket for compliance documents.
-- File paths are stored as: provider_id/timestamp-filename.ext

insert into storage.buckets (id, name, public)
values ('compliance-documents', 'compliance-documents', false)
on conflict (id) do nothing;

drop policy if exists "Authorized users can upload compliance documents" on storage.objects;
drop policy if exists "Authorized users can view compliance documents" on storage.objects;
drop policy if exists "Authorized users can update compliance documents" on storage.objects;
drop policy if exists "Authorized users can delete compliance documents" on storage.objects;

create policy "Authorized users can upload compliance documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'compliance-documents'
  and public.current_user_can_manage_house_records(((storage.foldername(name))[1])::uuid)
);

create policy "Authorized users can view compliance documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'compliance-documents'
  and public.current_user_has_provider_access(((storage.foldername(name))[1])::uuid)
);

create policy "Authorized users can update compliance documents"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'compliance-documents'
  and public.current_user_can_manage_house_records(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'compliance-documents'
  and public.current_user_can_manage_house_records(((storage.foldername(name))[1])::uuid)
);

create policy "Authorized users can delete compliance documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'compliance-documents'
  and public.current_user_can_manage_house_records(((storage.foldername(name))[1])::uuid)
);
