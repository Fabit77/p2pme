-- Campaign-level management, invitations, visibility, soft deletion, and images.
create type public.campaign_visibility as enum ('PUBLIC', 'PRIVATE');
create type public.campaign_member_role as enum ('editor', 'viewer');
create type public.withdrawal_method as enum ('USDC', 'BANK');
create type public.raffle_draw_presentation as enum ('WHEEL', 'LIST');

alter table public.campaigns
  add column visibility public.campaign_visibility not null default 'PUBLIC',
  add column deleted_at timestamptz;

create table public.campaign_members (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.campaign_member_role not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create table public.campaign_invitations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  email text not null check (char_length(email) <= 254),
  role public.campaign_member_role not null,
  invited_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (campaign_id, email)
);

create table public.raffle_draws (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null unique references public.campaigns(id) on delete restrict,
  presentation public.raffle_draw_presentation not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.raffle_draw_winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.raffle_draws(id) on delete restrict,
  position integer not null check (position > 0),
  prize_label text not null check (char_length(prize_label) between 1 and 120),
  raffle_ticket_id uuid not null references public.raffle_tickets(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (draw_id, position),
  unique (draw_id, raffle_ticket_id)
);

create or replace function public.can_view_campaign(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.campaigns c
    where c.id = p_campaign_id
      and (
        public.is_org_member(c.organization_id)
        or exists (
          select 1 from public.campaign_members cm
          where cm.campaign_id = c.id and cm.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_edit_campaign(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.campaigns c
    where c.id = p_campaign_id
      and (
        public.is_org_admin(c.organization_id)
        or exists (
          select 1 from public.campaign_members cm
          where cm.campaign_id = c.id and cm.user_id = auth.uid() and cm.role = 'editor'
        )
      )
  );
$$;

create or replace function public.can_edit_campaign_path(p_campaign_id text)
returns boolean language plpgsql stable security definer set search_path = public as $$
begin
  return public.can_edit_campaign(p_campaign_id::uuid);
exception when invalid_text_representation then
  return false;
end $$;

create or replace function public.accept_campaign_invitations()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.campaign_members(campaign_id, user_id, role)
  select i.campaign_id, new.id, i.role
  from public.campaign_invitations i
  where lower(i.email) = lower(new.email)
  on conflict (campaign_id, user_id) do update set role = excluded.role;

  delete from public.campaign_invitations where lower(email) = lower(new.email);
  return new;
end $$;

create or replace function public.conduct_raffle_draw(
  p_campaign_id uuid,
  p_prize_labels text[],
  p_presentation public.raffle_draw_presentation
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_campaign public.campaigns;
  v_draw_id uuid;
  v_prize_count integer := coalesce(array_length(p_prize_labels, 1), 0);
  v_paid_count integer;
  v_position integer := 0;
  v_winner record;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if not public.can_edit_campaign(p_campaign_id) then raise exception 'FORBIDDEN'; end if;

  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or v_campaign.deleted_at is not null then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
  if v_campaign.type <> 'RAFFLE' then raise exception 'CAMPAIGN_NOT_RAFFLE'; end if;
  if v_campaign.status <> 'CLOSED' then raise exception 'RAFFLE_MUST_BE_CLOSED'; end if;
  if exists(select 1 from public.raffle_draws where campaign_id = p_campaign_id) then raise exception 'RAFFLE_ALREADY_DRAWN'; end if;
  if v_prize_count < 1 or v_prize_count > 100 then raise exception 'INVALID_WINNER_COUNT'; end if;
  if exists(select 1 from unnest(p_prize_labels) as labels(label) where char_length(trim(label)) not between 1 and 120) then raise exception 'INVALID_PRIZE_LABEL'; end if;

  select count(*) into v_paid_count from public.raffle_tickets
  where campaign_id = p_campaign_id and status = 'PAID' and payment_id is not null;
  if v_paid_count < v_prize_count then raise exception 'NOT_ENOUGH_SOLD_TICKETS'; end if;

  insert into public.raffle_draws(campaign_id, presentation, created_by)
  values(p_campaign_id, p_presentation, auth.uid()) returning id into v_draw_id;

  for v_winner in
    select t.id as ticket_id, p.participant_id
    from public.raffle_tickets t
    join public.payments p on p.id = t.payment_id and p.status = 'COMPLETED'
    where t.campaign_id = p_campaign_id and t.status = 'PAID'
    order by gen_random_bytes(16)
    limit v_prize_count
  loop
    v_position := v_position + 1;
    insert into public.raffle_draw_winners(draw_id, position, prize_label, raffle_ticket_id, participant_id)
    values(v_draw_id, v_position, trim(p_prize_labels[v_position]), v_winner.ticket_id, v_winner.participant_id);
  end loop;

  insert into public.audit_events(organization_id, campaign_id, actor_type, actor_id, event_type, metadata)
  values(v_campaign.organization_id, p_campaign_id, 'organizer', auth.uid()::text, 'RAFFLE_DRAW_COMPLETED',
    jsonb_build_object('draw_id', v_draw_id, 'winner_count', v_prize_count, 'presentation', p_presentation));
  return v_draw_id;
end $$;

create or replace function public.close_raffle_for_draw(p_campaign_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_campaign public.campaigns;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if not public.can_edit_campaign(p_campaign_id) then raise exception 'FORBIDDEN'; end if;
  select * into v_campaign from public.campaigns where id = p_campaign_id for update;
  if not found or v_campaign.deleted_at is not null or v_campaign.type <> 'RAFFLE' then raise exception 'RAFFLE_NOT_FOUND'; end if;
  if v_campaign.status = 'CLOSED' then return; end if;
  if v_campaign.status <> 'ACTIVE' then raise exception 'RAFFLE_NOT_ACTIVE'; end if;
  if exists(
    select 1 from public.ticket_reservations
    where campaign_id = p_campaign_id and status = 'ACTIVE' and expires_at > now()
  ) then raise exception 'RAFFLE_HAS_ACTIVE_RESERVATIONS'; end if;
  update public.campaigns set status = 'CLOSED', updated_at = now() where id = p_campaign_id;
  insert into public.audit_events(organization_id, campaign_id, actor_type, actor_id, event_type)
  values(v_campaign.organization_id, p_campaign_id, 'organizer', auth.uid()::text, 'RAFFLE_CLOSED_FOR_DRAW');
end $$;

create or replace function public.enforce_campaign_checkout_access()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.campaigns c
    where c.id = new.campaign_id
      and c.status = 'ACTIVE'
      and c.deleted_at is null
      and (c.visibility = 'PUBLIC' or public.can_view_campaign(c.id))
  ) then
    raise exception using errcode = 'P0001', message = 'CAMPAIGN_NOT_AVAILABLE';
  end if;
  return new;
end $$;

drop trigger if exists enforce_reservation_campaign_access on public.ticket_reservations;
create trigger enforce_reservation_campaign_access
before insert on public.ticket_reservations
for each row execute procedure public.enforce_campaign_checkout_access();

drop trigger if exists enforce_payment_session_campaign_access on public.payment_sessions;
create trigger enforce_payment_session_campaign_access
before insert on public.payment_sessions
for each row execute procedure public.enforce_campaign_checkout_access();

drop trigger if exists on_profile_accept_campaign_invitations on public.profiles;
create trigger on_profile_accept_campaign_invitations
after insert or update of email on public.profiles
for each row execute procedure public.accept_campaign_invitations();

alter table public.campaign_members enable row level security;
alter table public.campaign_invitations enable row level security;
alter table public.raffle_draws enable row level security;
alter table public.raffle_draw_winners enable row level security;

drop policy if exists "members or public campaign readers read organizations" on public.organizations;
create policy "members campaign collaborators or public readers read organizations"
  on public.organizations for select using (
    public.is_org_member(organizations.id)
    or exists (
      select 1 from public.campaigns c
      where c.organization_id = organizations.id
        and c.status = 'ACTIVE' and c.visibility = 'PUBLIC' and c.deleted_at is null
    )
    or exists (
      select 1 from public.campaigns c
      join public.campaign_members cm on cm.campaign_id = c.id
      where c.organization_id = organizations.id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "public or members read campaigns" on public.campaigns;
drop policy if exists "admins update campaigns" on public.campaigns;
drop policy if exists "admins delete campaigns" on public.campaigns;
create policy "public or authorized users read campaigns" on public.campaigns for select using (
  (status = 'ACTIVE' and visibility = 'PUBLIC' and deleted_at is null)
  or public.can_view_campaign(id)
);
create policy "campaign editors update campaigns" on public.campaigns for update
  using (public.can_edit_campaign(id)) with check (public.can_edit_campaign(id));
create policy "organization admins delete campaigns" on public.campaigns for delete
  using (public.is_org_admin(organization_id));

drop policy if exists "public or admins read tickets" on public.raffle_tickets;
drop policy if exists "admins create tickets" on public.raffle_tickets;
drop policy if exists "admins update tickets" on public.raffle_tickets;
create policy "public or campaign collaborators read tickets" on public.raffle_tickets for select using (
  exists (
    select 1 from public.campaigns c where c.id = campaign_id
      and ((c.status = 'ACTIVE' and c.visibility = 'PUBLIC' and c.deleted_at is null) or public.can_view_campaign(c.id))
  )
);
create policy "campaign editors create tickets" on public.raffle_tickets for insert
  with check (public.can_edit_campaign(campaign_id));
create policy "campaign editors update tickets" on public.raffle_tickets for update
  using (public.can_edit_campaign(campaign_id)) with check (public.can_edit_campaign(campaign_id));

drop policy if exists "organizers read participants" on public.participants;
drop policy if exists "organizers read sessions" on public.payment_sessions;
drop policy if exists "organizers read reservations" on public.ticket_reservations;
drop policy if exists "organizers read payments" on public.payments;
drop policy if exists "organizers read audit" on public.audit_events;
drop policy if exists "organizers read allocations" on public.payment_ticket_allocations;
create policy "campaign collaborators read participants" on public.participants for select using (public.can_view_campaign(campaign_id));
create policy "campaign collaborators read sessions" on public.payment_sessions for select using (public.can_view_campaign(campaign_id));
create policy "campaign collaborators read reservations" on public.ticket_reservations for select using (public.can_view_campaign(campaign_id));
create policy "campaign collaborators read payments" on public.payments for select using (public.can_view_campaign(campaign_id));
create policy "campaign collaborators read audit" on public.audit_events for select using (
  public.is_org_admin(organization_id) or (campaign_id is not null and public.can_view_campaign(campaign_id))
);
create policy "campaign collaborators read allocations" on public.payment_ticket_allocations for select using (
  exists(select 1 from public.payments p where p.id = payment_id and public.can_view_campaign(p.campaign_id))
);

create policy "collaborators read campaign membership" on public.campaign_members for select using (
  user_id = auth.uid() or public.can_view_campaign(campaign_id)
);
create policy "editors manage campaign membership" on public.campaign_members for all
  using (public.can_edit_campaign(campaign_id)) with check (public.can_edit_campaign(campaign_id));
create policy "editors manage campaign invitations" on public.campaign_invitations for all
  using (public.can_edit_campaign(campaign_id)) with check (public.can_edit_campaign(campaign_id));
create policy "campaign collaborators read raffle draws" on public.raffle_draws for select
  using (public.can_view_campaign(campaign_id));
create policy "campaign collaborators read raffle winners" on public.raffle_draw_winners for select
  using (exists(select 1 from public.raffle_draws d where d.id = draw_id and public.can_view_campaign(d.campaign_id)));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-images', 'campaign-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "campaign editors upload images" on storage.objects for insert to authenticated
with check (
  bucket_id = 'campaign-images'
  and public.can_edit_campaign_path((storage.foldername(name))[1])
);
create policy "campaign editors update images" on storage.objects for update to authenticated
using (
  bucket_id = 'campaign-images'
  and public.can_edit_campaign_path((storage.foldername(name))[1])
) with check (
  bucket_id = 'campaign-images'
  and public.can_edit_campaign_path((storage.foldername(name))[1])
);
create policy "campaign editors delete images" on storage.objects for delete to authenticated
using (
  bucket_id = 'campaign-images'
  and public.can_edit_campaign_path((storage.foldername(name))[1])
);

alter table public.withdrawal_requests
  alter column destination_address drop not null,
  drop constraint if exists withdrawal_requests_destination_address_check,
  add column method public.withdrawal_method not null default 'USDC',
  add column bank_details jsonb,
  add column payout_reference text check (payout_reference is null or char_length(payout_reference) <= 200),
  add constraint withdrawal_requests_destination_check check (
    (method = 'USDC' and destination_address ~ '^0x[0-9a-fA-F]{40}$' and bank_details is null)
    or (method = 'BANK' and destination_address is null and bank_details is not null)
  );

drop function if exists public.create_withdrawal_request(uuid,bigint,text);
create or replace function public.create_withdrawal_request(
  p_organization_id uuid,
  p_amount_usdc_micro bigint,
  p_method public.withdrawal_method,
  p_destination_address text,
  p_bank_details jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_request_id uuid;
  v_total_received bigint;
  v_total_reserved bigint;
  v_destination text := nullif(trim(coalesce(p_destination_address, '')), '');
  v_bank_details jsonb;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if not public.is_org_admin(p_organization_id) then raise exception 'FORBIDDEN'; end if;
  if p_amount_usdc_micro is null or p_amount_usdc_micro <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  if p_method = 'USDC' then
    if v_destination is null or v_destination !~ '^0x[0-9a-fA-F]{40}$' then raise exception 'INVALID_DESTINATION_ADDRESS'; end if;
    v_bank_details := null;
  elsif p_method = 'BANK' then
    if p_bank_details is null or jsonb_typeof(p_bank_details) <> 'object' then raise exception 'INVALID_BANK_DETAILS'; end if;
    v_bank_details := jsonb_build_object(
      'accountHolder', trim(coalesce(p_bank_details ->> 'accountHolder', '')),
      'holderId', trim(coalesce(p_bank_details ->> 'holderId', '')),
      'bankName', trim(coalesce(p_bank_details ->> 'bankName', '')),
      'accountType', trim(coalesce(p_bank_details ->> 'accountType', '')),
      'accountNumber', trim(coalesce(p_bank_details ->> 'accountNumber', '')),
      'currency', upper(trim(coalesce(p_bank_details ->> 'currency', '')))
    );
    if char_length(v_bank_details ->> 'accountHolder') not between 2 and 120
      or char_length(v_bank_details ->> 'holderId') not between 2 and 80
      or char_length(v_bank_details ->> 'bankName') not between 2 and 120
      or char_length(v_bank_details ->> 'accountType') not between 2 and 60
      or char_length(v_bank_details ->> 'accountNumber') not between 3 and 100
      or (v_bank_details ->> 'currency') !~ '^[A-Z]{3}$'
    then raise exception 'INVALID_BANK_DETAILS'; end if;
    v_destination := null;
  else
    raise exception 'INVALID_WITHDRAWAL_METHOD';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text, 0));
  select coalesce(sum(usdc_amount_micro), 0)::bigint into v_total_received
  from public.payments
  where organization_id = p_organization_id and status = 'COMPLETED' and usdc_amount_micro is not null;
  select coalesce(sum(amount_usdc_micro), 0)::bigint into v_total_reserved
  from public.withdrawal_requests
  where organization_id = p_organization_id and status in ('PENDING', 'APPROVED', 'PAID');
  if p_amount_usdc_micro > v_total_received - v_total_reserved then raise exception 'INSUFFICIENT_AVAILABLE_BALANCE'; end if;

  insert into public.withdrawal_requests(
    organization_id, requested_by, method, destination_address, bank_details, amount_usdc_micro
  ) values (
    p_organization_id, auth.uid(), p_method,
    case when p_method = 'USDC' then lower(v_destination) else null end,
    v_bank_details, p_amount_usdc_micro
  ) returning id into v_request_id;

  insert into public.audit_events(organization_id, actor_type, actor_id, event_type, metadata)
  values (p_organization_id, 'organizer', auth.uid()::text, 'WITHDRAWAL_REQUESTED',
    jsonb_build_object('withdrawal_request_id', v_request_id, 'amount_usdc_micro', p_amount_usdc_micro, 'method', p_method));
  return v_request_id;
end $$;

revoke all on table public.campaign_members from anon, authenticated;
revoke all on table public.campaign_invitations from anon, authenticated;
revoke all on table public.raffle_draws from anon, authenticated;
revoke all on table public.raffle_draw_winners from anon, authenticated;
grant select, insert, update, delete on table public.campaign_members to authenticated;
grant select, insert, update, delete on table public.campaign_invitations to authenticated;
grant select on table public.raffle_draws to authenticated;
grant select on table public.raffle_draw_winners to authenticated;
grant execute on function public.can_view_campaign(uuid) to authenticated;
grant execute on function public.can_edit_campaign(uuid) to authenticated;
grant execute on function public.can_edit_campaign_path(text) to authenticated;
revoke all on function public.conduct_raffle_draw(uuid,text[],public.raffle_draw_presentation) from public, anon;
grant execute on function public.conduct_raffle_draw(uuid,text[],public.raffle_draw_presentation) to authenticated;
revoke all on function public.close_raffle_for_draw(uuid) from public, anon;
grant execute on function public.close_raffle_for_draw(uuid) to authenticated;
revoke all on function public.create_withdrawal_request(uuid,bigint,public.withdrawal_method,text,jsonb) from public, anon;
grant execute on function public.create_withdrawal_request(uuid,bigint,public.withdrawal_method,text,jsonb) to authenticated;
