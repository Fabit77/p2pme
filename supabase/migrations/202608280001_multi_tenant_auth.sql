-- User bootstrap and non-recursive multi-tenant authorization helpers.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, 'usuario'), '@', 1))
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_org_member(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(p_organization_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

create or replace function public.create_organization_with_owner(p_name text, p_slug text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if char_length(trim(p_name)) < 2 or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'INVALID_ORGANIZATION'; end if;
  insert into public.organizations(owner_id, name, slug)
  values(auth.uid(), trim(p_name), p_slug) returning id into v_id;
  insert into public.organization_members(organization_id, user_id, role)
  values(v_id, auth.uid(), 'owner');
  return v_id;
end $$;

drop policy if exists "members read organizations" on public.organizations;
drop policy if exists "owners manage organizations" on public.organizations;
drop policy if exists "members read membership" on public.organization_members;
drop policy if exists "owners manage membership" on public.organization_members;
drop policy if exists "public reads active campaigns" on public.campaigns;
drop policy if exists "owners manage campaigns" on public.campaigns;
drop policy if exists "public reads ticket availability" on public.raffle_tickets;
drop policy if exists "organizers read participants" on public.participants;
drop policy if exists "organizers read sessions" on public.payment_sessions;
drop policy if exists "organizers read reservations" on public.ticket_reservations;
drop policy if exists "organizers read payments" on public.payments;
drop policy if exists "organizers read audit" on public.audit_events;
drop policy if exists "organizers read payment ticket allocations" on public.payment_ticket_allocations;

create policy "members or public campaign readers read organizations" on public.organizations for select using (
  public.is_org_member(id) or exists(select 1 from public.campaigns c where c.organization_id = id and c.status = 'ACTIVE')
);
create policy "admins update organizations" on public.organizations for update using (public.is_org_admin(id)) with check (public.is_org_admin(id));
create policy "members read membership" on public.organization_members for select using (user_id = auth.uid() or public.is_org_admin(organization_id));
create policy "admins manage membership" on public.organization_members for all using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "public or members read campaigns" on public.campaigns for select using (status = 'ACTIVE' or public.is_org_member(organization_id));
create policy "admins create campaigns" on public.campaigns for insert with check (public.is_org_admin(organization_id));
create policy "admins update campaigns" on public.campaigns for update using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy "admins delete campaigns" on public.campaigns for delete using (public.is_org_admin(organization_id));

create policy "public or admins read tickets" on public.raffle_tickets for select using (
  exists(select 1 from public.campaigns c where c.id = campaign_id and (c.status = 'ACTIVE' or public.is_org_admin(c.organization_id)))
);
create policy "admins create tickets" on public.raffle_tickets for insert with check (
  exists(select 1 from public.campaigns c where c.id = campaign_id and public.is_org_admin(c.organization_id))
);
create policy "admins update tickets" on public.raffle_tickets for update using (
  exists(select 1 from public.campaigns c where c.id = campaign_id and public.is_org_admin(c.organization_id))
);

create policy "organizers read participants" on public.participants for select using (exists(select 1 from public.campaigns c where c.id = campaign_id and public.is_org_admin(c.organization_id)));
create policy "organizers read sessions" on public.payment_sessions for select using (public.is_org_admin(organization_id));
create policy "organizers read reservations" on public.ticket_reservations for select using (exists(select 1 from public.campaigns c where c.id = campaign_id and public.is_org_admin(c.organization_id)));
create policy "organizers read payments" on public.payments for select using (public.is_org_admin(organization_id));
create policy "organizers read audit" on public.audit_events for select using (public.is_org_admin(organization_id));
create policy "organizers read allocations" on public.payment_ticket_allocations for select using (
  exists(select 1 from public.payments p where p.id = payment_id and public.is_org_admin(p.organization_id))
);

revoke all on function public.create_organization_with_owner(text, text) from public, anon;
grant execute on function public.create_organization_with_owner(text, text) to authenticated;
grant execute on function public.is_org_member(uuid) to anon, authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;
