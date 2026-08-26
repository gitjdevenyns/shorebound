-- Close the admin_notes read, and restore the admin write that was closed with it.
--
-- 20260822160000_listings_and_ads.sql:93-94 revoked only writes:
--
--   revoke insert, update, delete on public.shop_listings from anon, authenticated;
--
-- SELECT was never revoked. Supabase's default grant to anon/authenticated
-- therefore still stood on the base tables, and the RLS policy
-- "public read live listings" is row-scoped, not column-scoped — so
--
--   GET /rest/v1/shop_listings?select=shop_slug,admin_notes
--
-- with the anon key that ships in the public bundle returns the column the
-- schema documents as "Private: rate, contact, renewal date. Never exposed to
-- anon." The shop_listing_public view was built to withhold it and does — but
-- nothing forced anyone through the view. Confirmed live: 200, rows returned.
-- Latent only because no deal has been signed yet, so every admin_notes is
-- still null. It starts leaking the first time the owner types a rate, silently
-- and with no further code change.
--
-- The same two lines broke the console. RLS cannot restore a missing table
-- grant, so "admin all listings ... to authenticated using (is_admin())" never
-- got the chance to run: the owner's Save failed at the grant layer with
-- permission denied, before any policy was consulted.
--
-- The fix separates the two concerns properly:
--   * table-level grants decide who may attempt an operation,
--   * RLS decides which rows, and
--   * column grants decide which columns.

-- 1. Writes: grant to authenticated, and let the existing admin RLS policy be
--    what actually restricts them. A non-admin passes the grant and is then
--    refused by `using (is_admin())`, which is the layering the policy assumed.
grant insert, update, delete on public.shop_listings to authenticated;
grant insert, update, delete on public.ad_campaigns  to authenticated;

-- 2. Reads: drop the blanket SELECT, then hand back exactly the public columns
--    — the same lists the _public views select. The views are
--    security_invoker = on, so they run with the caller's privileges and keep
--    working; a direct query for admin_notes now fails on the column.
revoke select on public.shop_listings from anon, authenticated;
revoke select on public.ad_campaigns  from anon, authenticated;

grant select (shop_slug, included, tier, starts_at, ends_at, enhanced, placements)
  on public.shop_listings to anon, authenticated;

grant select (id, advertiser, headline, body, image_url, href, slots, starts_at, ends_at, active)
  on public.ad_campaigns to anon, authenticated;

-- 3. The owner still needs admin_notes. Postgres column grants cannot express
--    "admins only", because admin here is an application fact (the `admins`
--    table), not a database role. So the console reads through a security
--    definer function that checks is_admin() itself — the same pattern
--    20260823140000_admin_user_management.sql already uses for accounts.

create or replace function public.admin_list_shop_listings()
returns setof public.shop_listings
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return query select * from public.shop_listings order by shop_slug;
end;
$$;

create or replace function public.admin_list_ad_campaigns()
returns setof public.ad_campaigns
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return query select * from public.ad_campaigns order by created_at desc;
end;
$$;

revoke all on function public.admin_list_shop_listings() from public, anon;
revoke all on function public.admin_list_ad_campaigns()  from public, anon;
grant execute on function public.admin_list_shop_listings() to authenticated;
grant execute on function public.admin_list_ad_campaigns()  to authenticated;
