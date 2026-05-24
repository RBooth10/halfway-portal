-- Link ROI authorizations to a specific emergency/approved contact.

alter table public.resident_roi_authorizations
add column if not exists emergency_contact_id uuid
references public.resident_emergency_contacts(id) on delete set null;

create index if not exists idx_resident_roi_authorizations_emergency_contact_id
on public.resident_roi_authorizations(emergency_contact_id);
