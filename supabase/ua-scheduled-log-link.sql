-- Link completed UA/BA logs back to scheduled UA randomizer items.

alter table public.ua_ba_logs
add column if not exists ua_randomizer_schedule_id uuid
references public.ua_randomizer_schedule(id) on delete set null;

create index if not exists idx_ua_ba_logs_ua_randomizer_schedule_id
on public.ua_ba_logs(ua_randomizer_schedule_id);
