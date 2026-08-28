create table public.payment_ticket_allocations (
  payment_id uuid not null references public.payments(id) on delete cascade,
  raffle_ticket_id uuid not null references public.raffle_tickets(id),
  created_at timestamptz not null default now(),
  primary key (payment_id, raffle_ticket_id)
);

alter table public.payment_ticket_allocations enable row level security;
create policy "organizers read payment ticket allocations" on public.payment_ticket_allocations
  for select using (
    exists (
      select 1 from public.payments p
      join public.organizations o on o.id = p.organization_id
      where p.id = payment_id and o.owner_id = auth.uid()
    )
  );

create or replace function public.reserve_raffle_tickets(
  p_campaign_id uuid,
  p_ticket_numbers integer[],
  p_participant_session_id uuid
)
returns table(reservation_id uuid, raffle_ticket_id uuid, ticket_number integer, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_ticket raffle_tickets;
  v_reservation_id uuid;
  v_expires timestamptz := now() + interval '10 minutes';
  v_requested_count integer;
begin
  v_requested_count := coalesce(array_length(p_ticket_numbers, 1), 0);
  if v_requested_count = 0 or v_requested_count > 100 then raise exception using errcode = 'P0001', message = 'INVALID_TICKET_SELECTION'; end if;
  if (select count(distinct value) from unnest(p_ticket_numbers) value) <> v_requested_count then raise exception using errcode = 'P0001', message = 'DUPLICATE_TICKET_SELECTION'; end if;

  update ticket_reservations set status = 'EXPIRED' where campaign_id = p_campaign_id and status = 'ACTIVE' and ticket_reservations.expires_at <= now();
  update raffle_tickets t set status = 'AVAILABLE', updated_at = now()
    where t.campaign_id = p_campaign_id and t.number = any(p_ticket_numbers) and t.status = 'RESERVED'
      and not exists (select 1 from ticket_reservations r where r.raffle_ticket_id = t.id and r.status = 'ACTIVE' and r.expires_at > now());

  if (select count(*) from raffle_tickets where campaign_id = p_campaign_id and number = any(p_ticket_numbers) and status = 'AVAILABLE') <> v_requested_count then
    raise exception using errcode = 'P0001', message = 'ONE_OR_MORE_TICKETS_UNAVAILABLE';
  end if;

  for v_ticket in select * from raffle_tickets where campaign_id = p_campaign_id and number = any(p_ticket_numbers) order by number for update loop
    if v_ticket.status <> 'AVAILABLE' then raise exception using errcode = 'P0001', message = 'ONE_OR_MORE_TICKETS_UNAVAILABLE'; end if;
    v_reservation_id := gen_random_uuid();
    insert into ticket_reservations(id, campaign_id, raffle_ticket_id, participant_session_id, expires_at)
      values(v_reservation_id, p_campaign_id, v_ticket.id, p_participant_session_id, v_expires);
    update raffle_tickets set status = 'RESERVED', updated_at = now() where id = v_ticket.id;
    reservation_id := v_reservation_id; raffle_ticket_id := v_ticket.id; ticket_number := v_ticket.number; expires_at := v_expires;
    return next;
  end loop;

  insert into audit_events(organization_id, campaign_id, actor_type, actor_id, event_type, metadata)
    select organization_id, id, 'participant', p_participant_session_id::text, 'TICKETS_RESERVED', jsonb_build_object('tickets', p_ticket_numbers)
    from campaigns where id = p_campaign_id;
end $$;

create or replace function public.attach_reservations_to_payment_session(p_session_id uuid, p_reservation_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare v_session payment_sessions; v_count integer;
begin
  select * into v_session from payment_sessions where id = p_session_id for update;
  if not found then raise exception 'PAYMENT_SESSION_NOT_FOUND'; end if;
  select count(*) into v_count from ticket_reservations where id = any(p_reservation_ids) and campaign_id = v_session.campaign_id and status = 'ACTIVE' and expires_at > now();
  if v_count <> array_length(p_reservation_ids, 1) then raise exception 'INVALID_OR_EXPIRED_RESERVATION'; end if;
  update ticket_reservations set payment_session_id = p_session_id where id = any(p_reservation_ids);
end $$;

create or replace function public.complete_verified_payment(p_session_id uuid, p_provider_order_id text, p_tx_hash text, p_usdc_amount_micro bigint)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_session payment_sessions; v_payment_id uuid; v_first_ticket_id uuid;
begin
  select * into v_session from payment_sessions where id = p_session_id for update;
  if not found then raise exception 'PAYMENT_SESSION_NOT_FOUND'; end if;
  select id into v_payment_id from payments where provider_order_id = p_provider_order_id;
  if v_payment_id is not null then return v_payment_id; end if;
  if v_session.status = 'COMPLETED' then select id into v_payment_id from payments where payment_session_id = p_session_id; return v_payment_id; end if;
  select raffle_ticket_id into v_first_ticket_id from ticket_reservations where payment_session_id = p_session_id and status = 'ACTIVE' order by created_at limit 1;
  if v_session.raffle_ticket_id is not null then v_first_ticket_id := v_session.raffle_ticket_id; end if;
  insert into payments(payment_session_id,campaign_id,organization_id,participant_id,raffle_ticket_id,provider_order_id,local_currency,local_amount_minor,usdc_amount_micro,tx_hash,status,completed_at)
    values(v_session.id,v_session.campaign_id,v_session.organization_id,v_session.participant_id,v_first_ticket_id,p_provider_order_id,v_session.local_currency,v_session.intended_local_amount_minor,p_usdc_amount_micro,p_tx_hash,'COMPLETED',now()) returning id into v_payment_id;
  insert into payment_ticket_allocations(payment_id, raffle_ticket_id)
    select v_payment_id, raffle_ticket_id from ticket_reservations where payment_session_id = p_session_id and status = 'ACTIVE'
    on conflict do nothing;
  if v_session.raffle_ticket_id is not null then insert into payment_ticket_allocations(payment_id, raffle_ticket_id) values(v_payment_id, v_session.raffle_ticket_id) on conflict do nothing; end if;
  update payment_sessions set status='COMPLETED',p2p_order_id=p_provider_order_id,tx_hash=p_tx_hash,quoted_usdc_amount_micro=p_usdc_amount_micro,completed_at=now(),updated_at=now() where id=p_session_id;
  update raffle_tickets set status='PAID',payment_id=v_payment_id,updated_at=now() where id in (select raffle_ticket_id from payment_ticket_allocations where payment_id=v_payment_id);
  update ticket_reservations set status='COMPLETED' where payment_session_id=p_session_id and status='ACTIVE';
  insert into audit_events(organization_id,campaign_id,actor_type,event_type,metadata) values(v_session.organization_id,v_session.campaign_id,'system','PAYMENT_COMPLETED',jsonb_build_object('payment_id',v_payment_id,'provider_order_id',p_provider_order_id));
  return v_payment_id;
end $$;

revoke all on function public.attach_reservations_to_payment_session(uuid,uuid[]) from public, anon, authenticated;
revoke all on function public.complete_verified_payment(uuid,text,text,bigint) from public, anon, authenticated;
grant execute on function public.reserve_raffle_tickets(uuid,integer[],uuid) to anon, authenticated;
