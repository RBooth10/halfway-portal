drop policy if exists "Client intake links can view compliance documents" on storage.objects;

create policy "Client intake links can view compliance documents"
on storage.objects
for select
to anon
using (
  bucket_id = 'compliance-documents'
);
