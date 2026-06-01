-- Resident sponsor information for provider-visible profile and future resident portal updates.

alter table public.residents
add column if not exists sponsor_name text,
add column if not exists sponsor_phone text,
add column if not exists current_step text;
