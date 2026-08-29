-- Allow visitors to resolve the organization attached to an active campaign.
-- The previous policy used an unqualified `id` inside the campaigns subquery,
-- which PostgreSQL resolved as campaigns.id instead of organizations.id.
drop policy if exists "members or public campaign readers read organizations" on public.organizations;

create policy "members or public campaign readers read organizations"
on public.organizations
for select
using (
  public.is_org_member(organizations.id)
  or exists (
    select 1
    from public.campaigns c
    where c.organization_id = organizations.id
      and c.status = 'ACTIVE'
  )
);
