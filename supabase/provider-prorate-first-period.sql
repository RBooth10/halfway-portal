-- Provider fee setting: prorate the resident's first billing period.

alter table public.providers
add column if not exists prorate_first_period boolean not null default true;
