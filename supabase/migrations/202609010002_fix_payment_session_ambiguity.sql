-- Qualify ticket_reservations.payment_session_id because the function's
-- RETURNS TABLE output column has the same name.
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

  perform 1 from public.ticket_reservations tr
    where tr.id = any(p_reservation_ids)
    order by tr.id for update;

  select count(*) into v_valid_count
    from public.ticket_reservations tr
    where tr.id = any(p_reservation_ids)
      and tr.campaign_id = p_campaign_id
      and tr.participant_session_id = p_participant_session_id
      and tr.status = 'ACTIVE'
      and tr.expires_at > now();
  if v_valid_count <> v_requested_count then
    raise exception using errcode = 'P0001', message = 'INVALID_OR_EXPIRED_RESERVATION';
  end if;

  select min(tr.payment_session_id) into v_existing_session_id
    from public.ticket_reservations tr
    where tr.id = any(p_reservation_ids) and tr.payment_session_id is not null;
  if v_existing_session_id is not null then
    if (select count(tr.payment_session_id) from public.ticket_reservations tr where tr.id = any(p_reservation_ids)) <> v_requested_count
      or (select count(distinct tr.payment_session_id) from public.ticket_reservations tr where tr.id = any(p_reservation_ids)) <> 1 then
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

  update public.ticket_reservations tr
    set payment_session_id = v_session_id
    where tr.id = any(p_reservation_ids);

  insert into public.audit_events(organization_id, campaign_id, actor_type, actor_id, event_type, metadata)
    values(v_campaign.organization_id, v_campaign.id, 'participant', p_participant_session_id::text,
      'PAYMENT_SESSION_CREATED', jsonb_build_object('payment_session_id', v_session_id, 'reservation_count', v_requested_count));

  return query select v_session_id, v_campaign.target_local_price_minor * v_requested_count, v_campaign.local_currency, v_receipt_token;
end $$;

revoke all on function public.create_checkout_payment_session(uuid,uuid[],uuid,text,text) from public;
grant execute on function public.create_checkout_payment_session(uuid,uuid[],uuid,text,text) to anon, authenticated;
