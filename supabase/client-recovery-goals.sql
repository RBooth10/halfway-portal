-- Resident-created recovery goals connected to client RCI assessment flow.

create table if not exists public.recovery_goals (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  rci_assessment_id uuid references public.rci_assessments(id) on delete set null,
  created_by_auth_user_id uuid,
  created_by_source text not null default 'resident_client',
  goal_area text not null default 'personal_capital',
  goal_text text not null,
  action_steps text,
  supports_needed text,
  target_date date,
  priority text not null default 'medium',
  status text not null default 'active',
  progress_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recovery_goals
add column if not exists rci_assessment_id uuid references public.rci_assessments(id) on delete set null,
add column if not exists created_by_source text not null default 'resident_client';

create index if not exists idx_recovery_goals_provider_id on public.recovery_goals(provider_id);
create index if not exists idx_recovery_goals_resident_id on public.recovery_goals(resident_id);
create index if not exists idx_recovery_goals_rci_assessment_id on public.recovery_goals(rci_assessment_id);

alter table public.recovery_goals enable row level security;

drop policy if exists "Users can view recovery goals for accessible providers" on public.recovery_goals;
drop policy if exists "Authorized users can create recovery goals" on public.recovery_goals;
drop policy if exists "Authorized users can update recovery goals" on public.recovery_goals;

create policy "Users can view recovery goals for accessible providers"
on public.recovery_goals
for select
to authenticated
using (public.current_user_has_provider_access(provider_id));

create policy "Authorized users can create recovery goals"
on public.recovery_goals
for insert
to authenticated
with check (public.current_user_can_manage_house_records(provider_id));

create policy "Authorized users can update recovery goals"
on public.recovery_goals
for update
to authenticated
using (public.current_user_can_manage_house_records(provider_id))
with check (public.current_user_can_manage_house_records(provider_id));

create or replace function public.submit_client_recovery_goals(
  p_access_token text,
  p_goals jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  assessment_record public.rci_assessments%rowtype;
  goal_record record;
  inserted_count integer := 0;
begin
  select *
  into assessment_record
  from public.rci_assessments
  where client_access_token = p_access_token
    and client_access_token is not null
    and status = 'completed'
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'Recovery goals can only be submitted after a completed assessment.'
    );
  end if;

  for goal_record in
    select *
    from jsonb_to_recordset(p_goals)
      as x(goal_area text, goal_text text, action_steps text, supports_needed text, priority text)
  loop
    if nullif(trim(goal_record.goal_text), '') is not null then
      insert into public.recovery_goals (
        provider_id,
        resident_id,
        rci_assessment_id,
        created_by_source,
        goal_area,
        goal_text,
        action_steps,
        supports_needed,
        priority,
        status
      )
      values (
        assessment_record.provider_id,
        assessment_record.resident_id,
        assessment_record.id,
        'resident_client',
        coalesce(nullif(trim(goal_record.goal_area), ''), 'personal_capital'),
        trim(goal_record.goal_text),
        nullif(trim(coalesce(goal_record.action_steps, '')), ''),
        nullif(trim(coalesce(goal_record.supports_needed, '')), ''),
        coalesce(nullif(trim(goal_record.priority), ''), 'medium'),
        'active'
      );

      inserted_count := inserted_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'inserted_count', inserted_count,
    'message', 'Recovery goals submitted successfully.'
  );
end;
$$;

grant execute on function public.submit_client_recovery_goals(text, jsonb) to anon, authenticated;
