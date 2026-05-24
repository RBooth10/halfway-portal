-- Auto-generate current resident charges and record payments.

create or replace function public.ensure_current_resident_fees(p_resident_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resident_record public.residents%rowtype;
  provider_record public.providers%rowtype;
  fee_amount numeric := 0;
  period_start_date date := current_date;
  period_end_date date := current_date;
  due_date_value date := current_date;
  monthly_day integer;
  last_day_of_month date;
  inserted_count integer := 0;
begin
  select *
  into resident_record
  from public.residents
  where id = p_resident_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Resident not found.');
  end if;

  if not public.current_user_has_provider_access(resident_record.provider_id) then
    return jsonb_build_object('ok', false, 'message', 'Not authorized for this provider.');
  end if;

  select *
  into provider_record
  from public.providers
  where id = resident_record.provider_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Provider not found.');
  end if;

  if provider_record.program_fee_model = 'split_rent' then
    if coalesce(provider_record.split_rent_client_count, 0) > 0 then
      fee_amount := coalesce(provider_record.split_rent_total_amount, 0) / provider_record.split_rent_client_count;
    else
      fee_amount := 0;
    end if;
  else
    fee_amount := coalesce(provider_record.cost_per_client, 0);
  end if;

  if provider_record.program_fee_frequency = 'monthly' then
    period_start_date := date_trunc('month', current_date)::date;
    period_end_date := (date_trunc('month', current_date)::date + interval '1 month - 1 day')::date;
    last_day_of_month := period_end_date;
    monthly_day := least(
      greatest(coalesce(provider_record.program_fee_charge_day_of_month, extract(day from current_date)::integer), 1),
      extract(day from last_day_of_month)::integer
    );
    due_date_value := period_start_date + (monthly_day - 1);
  elsif provider_record.program_fee_frequency = 'weekly' then
    period_start_date := date_trunc('week', current_date)::date;
    period_end_date := period_start_date + 6;
    due_date_value := current_date;
  elsif provider_record.program_fee_frequency = 'biweekly' then
    period_start_date := date_trunc('week', current_date)::date;
    period_end_date := period_start_date + 13;
    due_date_value := current_date;
  else
    period_start_date := current_date;
    period_end_date := current_date;
    due_date_value := current_date;
  end if;

  if fee_amount > 0 then
    insert into public.resident_fee_charges (
      provider_id,
      resident_id,
      house_id,
      charge_type,
      billing_frequency,
      period_start,
      period_end,
      due_date,
      amount,
      amount_paid,
      balance_due,
      status,
      notes
    )
    select
      resident_record.provider_id,
      resident_record.id,
      resident_record.house_id,
      'program_fee',
      coalesce(provider_record.program_fee_frequency, 'monthly'),
      period_start_date,
      period_end_date,
      due_date_value,
      fee_amount,
      0,
      fee_amount,
      'open',
      'Auto-generated from provider program fee settings.'
    where not exists (
      select 1
      from public.resident_fee_charges existing
      where existing.resident_id = resident_record.id
        and existing.charge_type = 'program_fee'
        and existing.period_start = period_start_date
        and existing.period_end = period_end_date
    );

    get diagnostics inserted_count = row_count;
  end if;

  if coalesce(provider_record.admission_fee_amount, 0) > 0 then
    insert into public.resident_fee_charges (
      provider_id,
      resident_id,
      house_id,
      charge_type,
      billing_frequency,
      due_date,
      amount,
      amount_paid,
      balance_due,
      status,
      notes
    )
    select
      resident_record.provider_id,
      resident_record.id,
      resident_record.house_id,
      'admission_fee',
      'one_time',
      coalesce(resident_record.admission_date, current_date),
      provider_record.admission_fee_amount,
      0,
      provider_record.admission_fee_amount,
      'open',
      case
        when provider_record.admission_fee_refundable then 'One-time refundable admission fee.'
        else 'One-time non-refundable admission fee.'
      end
    where not exists (
      select 1
      from public.resident_fee_charges existing
      where existing.resident_id = resident_record.id
        and existing.charge_type = 'admission_fee'
    );
  end if;

  return jsonb_build_object('ok', true, 'message', 'Resident fee charges checked.');
end;
$$;

grant execute on function public.ensure_current_resident_fees(uuid) to authenticated;

create or replace function public.record_resident_payment(
  p_resident_id uuid,
  p_fee_charge_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_reference_number text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  charge_record public.resident_fee_charges%rowtype;
  new_paid numeric;
  new_balance numeric;
  new_status text;
begin
  if p_amount <= 0 then
    return jsonb_build_object('ok', false, 'message', 'Payment amount must be greater than zero.');
  end if;

  select *
  into charge_record
  from public.resident_fee_charges
  where id = p_fee_charge_id
    and resident_id = p_resident_id
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'message', 'Fee charge not found.');
  end if;

  if not public.current_user_can_manage_house_records(charge_record.provider_id) then
    return jsonb_build_object('ok', false, 'message', 'Not authorized to record payments for this provider.');
  end if;

  insert into public.resident_payments (
    provider_id,
    resident_id,
    fee_charge_id,
    payment_date,
    amount,
    payment_method,
    reference_number,
    notes,
    created_by_auth_user_id
  )
  values (
    charge_record.provider_id,
    charge_record.resident_id,
    charge_record.id,
    current_date,
    p_amount,
    coalesce(nullif(trim(p_payment_method), ''), 'cash'),
    nullif(trim(coalesce(p_reference_number, '')), ''),
    nullif(trim(coalesce(p_notes, '')), ''),
    auth.uid()
  );

  new_paid := charge_record.amount_paid + p_amount;
  new_balance := greatest(charge_record.amount - new_paid, 0);
  new_status := case
    when new_balance <= 0 then 'paid'
    when new_paid > 0 then 'partial'
    else 'open'
  end;

  update public.resident_fee_charges
  set
    amount_paid = new_paid,
    balance_due = new_balance,
    status = new_status,
    updated_at = now()
  where id = charge_record.id;

  return jsonb_build_object('ok', true, 'message', 'Payment recorded.');
end;
$$;

grant execute on function public.record_resident_payment(uuid, uuid, numeric, text, text, text) to authenticated;
