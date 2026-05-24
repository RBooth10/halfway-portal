-- Custom permission selections for staff profiles.

alter table public.staff_profiles
add column if not exists custom_permissions text[] not null default '{}';
