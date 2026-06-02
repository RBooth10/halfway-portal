-- Resident portal sponsor/step updates with provider-visible timestamp.

alter table public.residents
add column if not exists sponsor_name text,
add column if not exists sponsor_phone text,
add column if not exists current_step text,
add column if not exists sponsor_info_updated_at timestamptz;

create or replace function public.update_client_portal_sponsor_info(
  p_access_token text,
  p_sponsor_name text,
  p_sponsor_phone text,
  p_current_step text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.resident_portal_links%rowtype;
begin
  select *
  into link_record
  from public.resident_portal_links
  where access_token = p_access_token
    and access_token is not null
    and status = 'active'
    and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'This resident portal link is invalid, disabled, or expired.'
    );
  end if;

  update public.residents
  set
    sponsor_name = nullif(trim(coalesce(p_sponsor_name, '')), ''),
    sponsor_phone = nullif(trim(coalesce(p_sponsor_phone, '')), ''),
    current_step = nullif(trim(coalesce(p_current_step, '')), ''),
    sponsor_info_updated_at = now()
  where id = link_record.resident_id;

  return jsonb_build_object(
    'ok', true,
    'message', 'Sponsor and step information updated.'
  );
end;
$$;

grant execute on function public.update_client_portal_sponsor_info(text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
