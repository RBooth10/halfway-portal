-- RLS policies for rolling UA randomizer rules and schedule.

alter table public.ua_randomizer_rules enable row level security;
alter table public.ua_randomizer_schedule enable row level security;
alter table public.ua_randomizer_runs enable row level security;

drop policy if exists "Users can view UA randomizer rules" on public.ua_randomizer_rules;
drop policy if exists "Authorized users can create UA randomizer rules" on public.ua_randomizer_rules;
drop policy if exists "Authorized users can update UA randomizer rules" on public.ua_randomizer_rules;

create policy "Users can view UA randomizer rules"
on public.ua_randomizer_rules
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create UA randomizer rules"
on public.ua_randomizer_rules
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update UA randomizer rules"
on public.ua_randomizer_rules
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));


drop policy if exists "Users can view UA randomizer schedule" on public.ua_randomizer_schedule;
drop policy if exists "Authorized users can create UA randomizer schedule" on public.ua_randomizer_schedule;
drop policy if exists "Authorized users can update UA randomizer schedule" on public.ua_randomizer_schedule;

create policy "Users can view UA randomizer schedule"
on public.ua_randomizer_schedule
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create UA randomizer schedule"
on public.ua_randomizer_schedule
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update UA randomizer schedule"
on public.ua_randomizer_schedule
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));


drop policy if exists "Users can view UA randomizer runs" on public.ua_randomizer_runs;
drop policy if exists "Authorized users can create UA randomizer runs" on public.ua_randomizer_runs;
drop policy if exists "Authorized users can update UA randomizer runs" on public.ua_randomizer_runs;

create policy "Users can view UA randomizer runs"
on public.ua_randomizer_runs
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create UA randomizer runs"
on public.ua_randomizer_runs
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update UA randomizer runs"
on public.ua_randomizer_runs
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));
