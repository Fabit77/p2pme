alter table public.payment_sessions
  add column if not exists participant_session_id uuid,
  add column if not exists payer_wallet_address text,
  add column if not exists receipt_token uuid not null default gen_random_uuid();

alter table public.payment_sessions
  drop constraint if exists payment_sessions_payer_wallet_address_check;

alter table public.payment_sessions
  add constraint payment_sessions_payer_wallet_address_check
  check (payer_wallet_address is null or payer_wallet_address ~ '^0x[0-9a-fA-F]{40}$');

create unique index if not exists payment_sessions_receipt_token_key
  on public.payment_sessions (receipt_token);

create or replace function public.create_checkout_payment_session(
  p_campaign_id uuid,
  p_reservation_ids uuid[],
  p_participant_session_id uuid,
  p_name text,
  p_email text
)
returns table(payment_session_id uuid, intended_local_amount_minor bigint, local_currency text, receipt_token uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_campaign public.campaigns;
  v_requested_count integer;
  v_valid_count integer;
  v_participant_id uuid;
  v_session_id uuid;
  v_existing_session_id uuid;
  v_receipt_token uuid;
begin
  v_requested_count := coalesce(array_length(p_reservation_ids, 1), 0);
  if v_requested_count = 0 or v_requested_count > 100 then
    raise exception using errcode = 'P0001', message = 'INVALID_RESERVATION_SELECTION';
  end if;
  if (select count(distinct value) from unnest(p_reservation_ids) value) <> v_requested_count then
    raise exception using errcode = 'P0001', message = 'DUPLICATE_RESERVATION_SELECTION';
  end if;
  if char_length(trim(p_name)) < 2 or char_length(trim(p_name)) > 120 then
    raise exception using errcode = 'P0001', message = 'INVALID_PARTICIPANT_NAME';
  end if;
  if char_length(trim(p_email)) > 254 or trim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode = 'P0001', message = 'INVALID_PARTICIPANT_EMAIL';
  end if;

  select * into v_campaign from public.campaigns
    where id = p_campaign_id and status = 'ACTIVE'
    for share;
  if not found then raise exception using errcode = 'P0001', message = 'CAMPAIGN_NOT_ACTIVE'; end if;

  perform 1 from public.ticket_reservations
    where id = any(p_reservation_ids)
    order by id for update;

  select count(*) into v_valid_count
    from public.ticket_reservations
    where id = any(p_reservation_ids)
      and campaign_id = p_campaign_id
      and participant_session_id = p_participant_session_id
      and status = 'ACTIVE'
      and expires_at > now();
  if v_valid_count <> v_requested_count then
    raise exception using errcode = 'P0001', message = 'INVALID_OR_EXPIRED_RESERVATION';
  end if;

  select min(payment_session_id) into v_existing_session_id
    from public.ticket_reservations
    where id = any(p_reservation_ids) and payment_session_id is not null;
  if v_existing_session_id is not null then
    if (select count(payment_session_id) from public.ticket_reservations where id = any(p_reservation_ids)) <> v_requested_count
      or (select count(distinct payment_session_id) from public.ticket_reservations where id = any(p_reservation_ids)) <> 1 then
      raise exception using errcode = 'P0001', message = 'RESERVATIONS_ALREADY_ATTACHED';
    end if;
    return query
      select s.id, s.intended_local_amount_minor, s.local_currency, s.receipt_token
      from public.payment_sessions s
      where s.id = v_existing_session_id and s.participant_session_id = p_participant_session_id;
    if found then return; end if;
    raise exception using errcode = 'P0001', message = 'RESERVATIONS_ALREADY_ATTACHED';
  end if;

  insert into public.participants(campaign_id, name, email)
    values(p_campaign_id, trim(p_name), lower(trim(p_email)))
    returning id into v_participant_id;

  insert into public.payment_sessions(
    campaign_id, organization_id, participant_id, participant_session_id,
    local_currency, intended_local_amount_minor, status
  ) values(
    v_campaign.id, v_campaign.organization_id, v_participant_id, p_participant_session_id,
    v_campaign.local_currency, v_campaign.target_local_price_minor * v_requested_count, 'RESERVED'
  ) returning id, payment_sessions.receipt_token into v_session_id, v_receipt_token;

  update public.ticket_reservations
    set payment_session_id = v_session_id
    where id = any(p_reservation_ids);

  insert into public.audit_events(organization_id, campaign_id, actor_type, actor_id, event_type, metadata)
    values(v_campaign.organization_id, v_campaign.id, 'participant', p_participant_session_id::text,
      'PAYMENT_SESSION_CREATED', jsonb_build_object('payment_session_id', v_session_id, 'reservation_count', v_requested_count));

  return query select v_session_id, v_campaign.target_local_price_minor * v_requested_count, v_campaign.local_currency, v_receipt_token;
end $$;

create or replace function public.record_p2p_order(
  p_session_id uuid,
  p_participant_session_id uuid,
  p_order_id text,
  p_tx_hash text,
  p_payer_wallet_address text
)
returns void language plpgsql security definer set search_path = public as $$
declare v_session public.payment_sessions;
begin
  if p_order_id !~ '^[0-9]+$' or char_length(p_order_id) > 78 then
    raise exception using errcode = 'P0001', message = 'INVALID_P2P_ORDER_ID';
  end if;
  if p_tx_hash !~ '^0x[0-9a-fA-F]{64}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_TRANSACTION_HASH';
  end if;
  if p_payer_wallet_address !~ '^0x[0-9a-fA-F]{40}$' then
    raise exception using errcode = 'P0001', message = 'INVALID_PAYER_WALLET';
  end if;

  select * into v_session from public.payment_sessions
    where id = p_session_id and participant_session_id = p_participant_session_id
    for update;
  if not found then raise exception using errcode = 'P0001', message = 'PAYMENT_SESSION_NOT_FOUND'; end if;
  if v_session.status = 'COMPLETED' then return; end if;
  if v_session.p2p_order_id is not null and v_session.p2p_order_id <> p_order_id then
    raise exception using errcode = 'P0001', message = 'PAYMENT_SESSION_HAS_ANOTHER_ORDER';
  end if;
  if not exists(
    select 1 from public.ticket_reservations
    where payment_session_id = p_session_id and status = 'ACTIVE' and expires_at > now()
  ) then raise exception using errcode = 'P0001', message = 'RESERVATION_EXPIRED'; end if;

  update public.payment_sessions set
    p2p_order_id = p_order_id,
    tx_hash = lower(p_tx_hash),
    payer_wallet_address = lower(p_payer_wallet_address),
    status = 'P2P_ORDER_CREATED',
    updated_at = now()
  where id = p_session_id;

  update public.ticket_reservations
    set expires_at = greatest(expires_at, now() + interval '35 minutes')
    where payment_session_id = p_session_id and status = 'ACTIVE';

  insert into public.audit_events(organization_id, campaign_id, actor_type, actor_id, event_type, metadata)
    values(v_session.organization_id, v_session.campaign_id, 'participant', p_participant_session_id::text,
      'P2P_ORDER_CREATED', jsonb_build_object('payment_session_id', p_session_id, 'order_id', p_order_id, 'tx_hash', lower(p_tx_hash)));
end $$;

create or replace function public.get_payment_receipt(p_payment_id uuid, p_receipt_token uuid)
returns table(
  organization_name text,
  organization_slug text,
  campaign_title text,
  campaign_slug text,
  participant_name text,
  local_currency text,
  local_amount_minor bigint,
  usdc_amount_micro bigint,
  completed_at timestamptz,
  provider_order_id text,
  tx_hash text,
  ticket_numbers integer[]
)
language sql stable security definer set search_path = public as $$
  select o.name, o.slug, c.title, c.slug, pt.name, p.local_currency, p.local_amount_minor,
    p.usdc_amount_micro, p.completed_at, p.provider_order_id, p.tx_hash,
    coalesce(array_agg(t.number order by t.number) filter (where t.number is not null), '{}'::integer[])
  from public.payments p
  join public.payment_sessions s on s.id = p.payment_session_id and s.receipt_token = p_receipt_token
  join public.organizations o on o.id = p.organization_id
  join public.campaigns c on c.id = p.campaign_id
  join public.participants pt on pt.id = p.participant_id
  left join public.payment_ticket_allocations a on a.payment_id = p.id
  left join public.raffle_tickets t on t.id = a.raffle_ticket_id
  where p.id = p_payment_id and p.status = 'COMPLETED'
  group by o.name, o.slug, c.title, c.slug, pt.name, p.local_currency, p.local_amount_minor,
    p.usdc_amount_micro, p.completed_at, p.provider_order_id, p.tx_hash;
$$;

revoke all on function public.create_checkout_payment_session(uuid,uuid[],uuid,text,text) from public;
revoke all on function public.record_p2p_order(uuid,uuid,text,text,text) from public;
revoke all on function public.get_payment_receipt(uuid,uuid) from public;
grant execute on function public.create_checkout_payment_session(uuid,uuid[],uuid,text,text) to anon, authenticated;
grant execute on function public.record_p2p_order(uuid,uuid,text,text,text) to anon, authenticated;
grant execute on function public.get_payment_receipt(uuid,uuid) to anon, authenticated;
