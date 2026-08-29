-- Campaign-level management, invitations, visibility, soft deletion, and images.
create type public.campaign_visibility as enum ('PUBLIC', 'PRIVATE');
create type public.campaign_member_role as enum ('editor', 'viewer');

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

revoke all on table public.campaign_members from anon, authenticated;
revoke all on table public.campaign_invitations from anon, authenticated;
grant select, insert, update, delete on table public.campaign_members to authenticated;
grant select, insert, update, delete on table public.campaign_invitations to authenticated;
grant execute on function public.can_view_campaign(uuid) to authenticated;
grant execute on function public.can_edit_campaign(uuid) to authenticated;
grant execute on function public.can_edit_campaign_path(text) to authenticated;
