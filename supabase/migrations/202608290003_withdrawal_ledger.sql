-- Custodial hackathon ledger: verified P2P payments credit an organization and
-- withdrawal requests reserve that credit until Fondo reviews and pays them.
do $$ begin
  create type public.withdrawal_status as enum ('PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED');
exception when duplicate_object then null;
end $$;

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  destination_address text not null check (destination_address ~ '^0x[0-9a-fA-F]{40}$'),
  amount_usdc_micro bigint not null check (amount_usdc_micro > 0),
  status public.withdrawal_status not null default 'PENDING',
  reviewed_by uuid references public.profiles(id),
  payout_tx_hash text check (payout_tx_hash is null or payout_tx_hash ~ '^0x[0-9a-fA-F]{64}$'),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  paid_at timestamptz
);

create index if not exists withdrawal_requests_organization_created_idx
  on public.withdrawal_requests (organization_id, created_at desc);
create index if not exists payments_organization_completed_idx
  on public.payments (organization_id, completed_at desc)
  where status = 'COMPLETED';

alter table public.withdrawal_requests enable row level security;

drop policy if exists "organizers read withdrawals" on public.withdrawal_requests;
create policy "organizers read withdrawals" on public.withdrawal_requests
  for select using (public.is_org_admin(organization_id));

create or replace function public.create_withdrawal_request(
  p_organization_id uuid,
  p_amount_usdc_micro bigint,
  p_destination_address text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_total_received bigint;
  v_total_reserved bigint;
  v_destination text := trim(p_destination_address);
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if not public.is_org_admin(p_organization_id) then raise exception 'FORBIDDEN'; end if;
  if p_amount_usdc_micro is null or p_amount_usdc_micro <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if v_destination !~ '^0x[0-9a-fA-F]{40}$' then raise exception 'INVALID_DESTINATION_ADDRESS'; end if;

  -- Serialize requests per organization so two simultaneous requests cannot
  -- spend the same available balance.
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 0));

  select coalesce(sum(usdc_amount_micro), 0)::bigint into v_total_received
  from public.payments
  where organization_id = p_organization_id
    and status = 'COMPLETED'
    and usdc_amount_micro is not null;

  select coalesce(sum(amount_usdc_micro), 0)::bigint into v_total_reserved
  from public.withdrawal_requests
  where organization_id = p_organization_id
    and status in ('PENDING', 'APPROVED', 'PAID');

  if p_amount_usdc_micro > v_total_received - v_total_reserved then
    raise exception 'INSUFFICIENT_AVAILABLE_BALANCE';
  end if;

  insert into public.withdrawal_requests(
    organization_id, requested_by, destination_address, amount_usdc_micro
  ) values (
    p_organization_id, auth.uid(), lower(v_destination), p_amount_usdc_micro
  ) returning id into v_request_id;

  insert into public.audit_events(organization_id, actor_type, actor_id, event_type, metadata)
  values (
    p_organization_id,
    'organizer',
    auth.uid()::text,
    'WITHDRAWAL_REQUESTED',
    jsonb_build_object('withdrawal_request_id', v_request_id, 'amount_usdc_micro', p_amount_usdc_micro)
  );

  return v_request_id;
end $$;

create or replace function public.cancel_withdrawal_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.withdrawal_requests;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;

  select * into v_request
  from public.withdrawal_requests
  where id = p_request_id
  for update;

  if not found then raise exception 'WITHDRAWAL_NOT_FOUND'; end if;
  if not public.is_org_admin(v_request.organization_id) then raise exception 'FORBIDDEN'; end if;
  if v_request.status <> 'PENDING' then raise exception 'WITHDRAWAL_NOT_PENDING'; end if;

  update public.withdrawal_requests
  set status = 'CANCELLED', updated_at = now()
  where id = p_request_id;

  insert into public.audit_events(organization_id, actor_type, actor_id, event_type, metadata)
  values (
    v_request.organization_id,
    'organizer',
    auth.uid()::text,
    'WITHDRAWAL_CANCELLED',
    jsonb_build_object('withdrawal_request_id', p_request_id)
  );
end $$;

revoke all on table public.withdrawal_requests from anon, authenticated;
grant select on table public.withdrawal_requests to authenticated;
revoke all on function public.create_withdrawal_request(uuid,bigint,text) from public, anon;
revoke all on function public.cancel_withdrawal_request(uuid) from public, anon;
grant execute on function public.create_withdrawal_request(uuid,bigint,text) to authenticated;
grant execute on function public.cancel_withdrawal_request(uuid) to authenticated;
