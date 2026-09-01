-- Keep public campaign reads independent from direct campaign_members grants.
-- The previous organization policy joined campaign_members in the caller's
-- context, so anonymous visitors received a permission error before RLS could
-- return an active public campaign.
create or replace function public.can_read_organization(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_org_member(p_organization_id)
    or exists (
      select 1
      from public.campaigns c
      where c.organization_id = p_organization_id
        and c.status = 'ACTIVE'
        and c.visibility = 'PUBLIC'
        and c.deleted_at is null
    )
    or exists (
      select 1
      from public.campaigns c
      join public.campaign_members cm on cm.campaign_id = c.id
      where c.organization_id = p_organization_id
        and cm.user_id = auth.uid()
    );
$$;

revoke all on function public.can_read_organization(uuid) from public;
grant execute on function public.can_read_organization(uuid) to anon, authenticated;

drop policy if exists "members campaign collaborators or public readers read organizations"
  on public.organizations;
create policy "members campaign collaborators or public readers read organizations"
  on public.organizations
  for select
  using (public.can_read_organization(id));
