-- UA randomizer schedule generation.

create table if not exists public.ua_randomizer_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  house_id uuid references public.houses(id) on delete set null,
  start_date date not null,
  end_date date not null,
  strategy text not null default 'random'
    check (strategy in ('random', 'length_of_stay')),
  min_tests_per_resident integer not null default 1,
  max_tests_per_resident integer not null default 2,
  generated_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ua_randomizer_schedule (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  run_id uuid not null references public.ua_randomizer_runs(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  house_id uuid references public.houses(id) on delete set null,
  scheduled_date date not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'skipped', 'cancelled')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ua_randomizer_runs_provider_id
on public.ua_randomizer_runs(provider_id);

create index if not exists idx_ua_randomizer_schedule_provider_id
on public.ua_randomizer_schedule(provider_id);

create index if not exists idx_ua_randomizer_schedule_resident_id
on public.ua_randomizer_schedule(resident_id);

create index if not exists idx_ua_randomizer_schedule_scheduled_date
on public.ua_randomizer_schedule(scheduled_date);
