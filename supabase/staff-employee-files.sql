-- Link employee/staff files to staff profiles through the existing documents table.

alter table public.documents
add column if not exists staff_profile_id uuid
references public.staff_profiles(id) on delete set null;

create index if not exists idx_documents_staff_profile_id
on public.documents(staff_profile_id);
