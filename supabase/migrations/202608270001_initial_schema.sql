create extension if not exists pgcrypto;

create type public.organization_role as enum ('owner', 'admin');
create type public.campaign_type as enum ('RAFFLE', 'COLLECTION', 'EVENT', 'MEMBERSHIP', 'OTHER');
create type public.campaign_status as enum ('DRAFT', 'ACTIVE', 'CLOSED');
create type public.ticket_status as enum ('AVAILABLE', 'RESERVED', 'PAID');
create type public.reservation_status as enum ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');
create type public.payment_status as enum ('CREATED', 'RESERVED', 'P2P_ORDER_CREATED', 'WAITING_FOR_PAYMENT', 'PAYMENT_REPORTED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null check (char_length(display_name) between 1 and 100),
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
  name text not null check (char_length(name) between 2 and 120), slug text not null unique,
  description text, country text not null default 'AR', local_currency text not null default 'ARS',
  settlement_wallet_address text check (settlement_wallet_address is null or settlement_wallet_address ~ '^0x[0-9a-fA-F]{40}$'),
  logo_url text, contact text, created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, role public.organization_role not null,
  created_at timestamptz not null default now(), unique (organization_id, user_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  type public.campaign_type not null, title text not null check (char_length(title) between 2 and 100), slug text not null,
  description text not null check (char_length(description) <= 1000), status public.campaign_status not null default 'DRAFT',
  local_currency text not null default 'ARS', target_local_price_minor bigint not null check (target_local_price_minor >= 0),
  goal_local_amount_minor bigint not null check (goal_local_amount_minor >= 0), ticket_count integer not null default 0 check (ticket_count between 0 and 10000),
  cover_image_url text, starts_at timestamptz, ends_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.raffle_tickets (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade,
  number integer not null check (number > 0), status public.ticket_status not null default 'AVAILABLE', payment_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (campaign_id, number)
);

create table public.participants (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120), email text not null check (char_length(email) <= 254),
  phone text check (phone is null or char_length(phone) <= 30), created_at timestamptz not null default now()
);

create table public.payment_sessions (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id), organization_id uuid not null references public.organizations(id),
  participant_id uuid references public.participants(id), raffle_ticket_id uuid references public.raffle_tickets(id), local_currency text not null,
  intended_local_amount_minor bigint not null check (intended_local_amount_minor >= 0), quoted_usdc_amount_micro bigint,
  quote_metadata jsonb not null default '{}'::jsonb, status public.payment_status not null default 'CREATED', p2p_order_id text unique, tx_hash text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz
);

create table public.ticket_reservations (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns(id) on delete cascade,
  raffle_ticket_id uuid not null references public.raffle_tickets(id) on delete cascade, payment_session_id uuid references public.payment_sessions(id),
  participant_session_id uuid not null, expires_at timestamptz not null, status public.reservation_status not null default 'ACTIVE', created_at timestamptz not null default now()
);
create unique index one_active_reservation_per_ticket on public.ticket_reservations (raffle_ticket_id) where status = 'ACTIVE';

create table public.payments (
  id uuid primary key default gen_random_uuid(), payment_session_id uuid not null unique references public.payment_sessions(id), campaign_id uuid not null references public.campaigns(id),
  organization_id uuid not null references public.organizations(id), participant_id uuid not null references public.participants(id), raffle_ticket_id uuid references public.raffle_tickets(id),
  provider text not null default 'p2p.me', provider_order_id text not null unique, local_currency text not null, local_amount_minor bigint not null,
  usdc_amount_micro bigint, tx_hash text, status public.payment_status not null, completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.raffle_tickets add constraint raffle_tickets_payment_fk foreign key (payment_id) references public.payments(id);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), campaign_id uuid references public.campaigns(id),
  actor_type text not null, actor_id text, event_type text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create or replace function public.reserve_raffle_ticket(p_campaign_id uuid, p_ticket_number integer, p_participant_session_id uuid)
returns table(reservation_id uuid, raffle_ticket_id uuid, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_ticket public.raffle_tickets; v_reservation uuid := gen_random_uuid(); v_expires timestamptz := now() + interval '10 minutes';
begin
  update ticket_reservations set status = 'EXPIRED' where campaign_id = p_campaign_id and status = 'ACTIVE' and expires_at <= now();
  update raffle_tickets t set status = 'AVAILABLE', updated_at = now()
    where t.campaign_id = p_campaign_id and t.number = p_ticket_number and t.status = 'RESERVED'
    and not exists (select 1 from ticket_reservations r where r.raffle_ticket_id = t.id and r.status = 'ACTIVE' and r.expires_at > now());
  select * into v_ticket from raffle_tickets where campaign_id = p_campaign_id and number = p_ticket_number for update;
  if not found or v_ticket.status <> 'AVAILABLE' then raise exception using errcode = 'P0001', message = 'TICKET_UNAVAILABLE'; end if;
  insert into ticket_reservations(id,campaign_id,raffle_ticket_id,participant_session_id,expires_at) values(v_reservation,p_campaign_id,v_ticket.id,p_participant_session_id,v_expires);
  update raffle_tickets set status = 'RESERVED', updated_at = now() where id = v_ticket.id;
  insert into audit_events(organization_id,campaign_id,actor_type,actor_id,event_type,metadata)
    select organization_id,id,'participant',p_participant_session_id::text,'TICKET_RESERVED',jsonb_build_object('ticket',p_ticket_number,'reservation_id',v_reservation) from campaigns where id=p_campaign_id;
  return query select v_reservation, v_ticket.id, v_expires;
end $$;

create or replace function public.complete_verified_payment(p_session_id uuid, p_provider_order_id text, p_tx_hash text, p_usdc_amount_micro bigint)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_session payment_sessions; v_payment_id uuid;
begin
  select * into v_session from payment_sessions where id = p_session_id for update;
  if not found then raise exception 'PAYMENT_SESSION_NOT_FOUND'; end if;
  select id into v_payment_id from payments where provider_order_id = p_provider_order_id;
  if v_payment_id is not null then return v_payment_id; end if;
  if v_session.status = 'COMPLETED' then select id into v_payment_id from payments where payment_session_id=p_session_id; return v_payment_id; end if;
  insert into payments(payment_session_id,campaign_id,organization_id,participant_id,raffle_ticket_id,provider_order_id,local_currency,local_amount_minor,usdc_amount_micro,tx_hash,status,completed_at)
    values(v_session.id,v_session.campaign_id,v_session.organization_id,v_session.participant_id,v_session.raffle_ticket_id,p_provider_order_id,v_session.local_currency,v_session.intended_local_amount_minor,p_usdc_amount_micro,p_tx_hash,'COMPLETED',now()) returning id into v_payment_id;
  update payment_sessions set status='COMPLETED',p2p_order_id=p_provider_order_id,tx_hash=p_tx_hash,quoted_usdc_amount_micro=p_usdc_amount_micro,completed_at=now(),updated_at=now() where id=p_session_id;
  update raffle_tickets set status='PAID',payment_id=v_payment_id,updated_at=now() where id=v_session.raffle_ticket_id;
  update ticket_reservations set status='COMPLETED' where payment_session_id=p_session_id and status='ACTIVE';
  insert into audit_events(organization_id,campaign_id,actor_type,event_type,metadata) values(v_session.organization_id,v_session.campaign_id,'system','PAYMENT_COMPLETED',jsonb_build_object('payment_id',v_payment_id,'provider_order_id',p_provider_order_id));
  return v_payment_id;
end $$;

alter table profiles enable row level security; alter table organizations enable row level security; alter table organization_members enable row level security;
alter table campaigns enable row level security; alter table raffle_tickets enable row level security; alter table participants enable row level security;
alter table payment_sessions enable row level security; alter table ticket_reservations enable row level security; alter table payments enable row level security; alter table audit_events enable row level security;

create policy "profiles own row" on profiles for all using (id=auth.uid()) with check (id=auth.uid());
create policy "members read organizations" on organizations for select using (owner_id=auth.uid() or exists(select 1 from organization_members m where m.organization_id=id and m.user_id=auth.uid()));
create policy "owners manage organizations" on organizations for all using (owner_id=auth.uid()) with check (owner_id=auth.uid());
create policy "members read membership" on organization_members for select using (user_id=auth.uid() or exists(select 1 from organizations o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "owners manage membership" on organization_members for all using (exists(select 1 from organizations o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "public reads active campaigns" on campaigns for select using (status='ACTIVE' or exists(select 1 from organizations o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "owners manage campaigns" on campaigns for all using (exists(select 1 from organizations o where o.id=organization_id and o.owner_id=auth.uid())) with check (exists(select 1 from organizations o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "public reads ticket availability" on raffle_tickets for select using (exists(select 1 from campaigns c where c.id=campaign_id and c.status='ACTIVE'));
create policy "organizers read participants" on participants for select using (exists(select 1 from campaigns c join organizations o on o.id=c.organization_id where c.id=campaign_id and o.owner_id=auth.uid()));
create policy "organizers read sessions" on payment_sessions for select using (exists(select 1 from organizations o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "organizers read reservations" on ticket_reservations for select using (exists(select 1 from campaigns c join organizations o on o.id=c.organization_id where c.id=campaign_id and o.owner_id=auth.uid()));
create policy "organizers read payments" on payments for select using (exists(select 1 from organizations o where o.id=organization_id and o.owner_id=auth.uid()));
create policy "organizers read audit" on audit_events for select using (exists(select 1 from organizations o where o.id=organization_id and o.owner_id=auth.uid()));

revoke all on function public.complete_verified_payment(uuid,text,text,bigint) from public, anon, authenticated;
grant execute on function public.reserve_raffle_ticket(uuid,integer,uuid) to anon, authenticated;
