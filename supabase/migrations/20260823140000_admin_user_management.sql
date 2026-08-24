-- Owner tooling for accounts.
--
-- The console needs to see who signed up, when, whether they have confirmed
-- their address, and which tier they are on — and it needs to be able to grant
-- premium, correct a name, and start a password reset.
--
-- None of that can be done from the client with the anon key, because none of
-- it is the caller's own row. Two mechanisms, chosen per operation:
--
--   * READS go through a security-definer view + function pair, so the console
--     can list accounts without the service role ever reaching the browser.
--     Every one of them re-checks is_admin() internally: being able to CALL the
--     function is not the same as being allowed to see the answer.
--   * WRITES that touch auth.users itself (email, password reset) go through
--     the `admin-users` Edge Function, because changing an identity is the
--     service role's job and must not be reachable by a crafted PostgREST call.
--
-- Tier lives in public.profiles, so granting premium is an ordinary UPDATE that
-- the existing admin policy already allows.

-- What the console may see about an account. Deliberately not `select *` on
-- auth.users: no password hashes, no recovery tokens, no raw provider payloads.
create or replace function public.admin_list_users(
  search text default null,
  limit_n int default 200
)
returns table (
  id             uuid,
  email          text,
  display_name   text,
  tier           text,
  units          text,
  home_slug      text,
  marketing_opt_in boolean,
  is_admin       boolean,
  created_at     timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- The gate. Without this, security definer would hand every signed-in reader
  -- the whole user table.
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.display_name,
    coalesce(p.tier, 'free')      as tier,
    coalesce(p.units, 'imperial') as units,
    p.home_slug,
    coalesce(p.marketing_opt_in, false) as marketing_opt_in,
    exists (select 1 from public.admins a where a.user_id = u.id) as is_admin,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where search is null
     or search = ''
     or u.email ilike '%' || search || '%'
     or p.display_name ilike '%' || search || '%'
  order by u.created_at desc
  limit greatest(1, least(coalesce(limit_n, 200), 1000));
end;
$$;

revoke all on function public.admin_list_users(text, int) from public, anon;
grant execute on function public.admin_list_users(text, int) to authenticated;

-- Sign-ups over time, for the dashboard line at the top of the screen.
create or replace function public.admin_signup_stats()
returns table (
  total          bigint,
  confirmed      bigint,
  paid           bigint,
  last_7_days    bigint,
  last_30_days   bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return query
  select
    count(*)::bigint,
    count(*) filter (where u.email_confirmed_at is not null)::bigint,
    count(*) filter (where p.tier = 'paid')::bigint,
    count(*) filter (where u.created_at > now() - interval '7 days')::bigint,
    count(*) filter (where u.created_at > now() - interval '30 days')::bigint
  from auth.users u
  left join public.profiles p on p.id = u.id;
end;
$$;

revoke all on function public.admin_signup_stats() from public, anon;
grant execute on function public.admin_signup_stats() to authenticated;

-- Granting and revoking premium. An ordinary profiles UPDATE would work under
-- the existing admin policy, but routing it through a function keeps the rule
-- in one place and records who did it.
create table if not exists public.account_audit (
  id         bigserial primary key,
  actor      uuid        not null,
  subject    uuid        not null,
  action     text        not null,
  detail     jsonb       not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.account_audit enable row level security;

drop policy if exists "admins read audit" on public.account_audit;
create policy "admins read audit"
  on public.account_audit for select to authenticated using (public.is_admin());

revoke all on public.account_audit from anon;

create or replace function public.admin_set_tier(target uuid, next_tier text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  if next_tier not in ('free', 'paid') then
    raise exception 'tier must be free or paid';
  end if;

  update public.profiles set tier = next_tier, updated_at = now() where id = target;

  insert into public.account_audit (actor, subject, action, detail)
  values (auth.uid(), target, 'set_tier', jsonb_build_object('tier', next_tier));
end;
$$;

revoke all on function public.admin_set_tier(uuid, text) from public, anon;
grant execute on function public.admin_set_tier(uuid, text) to authenticated;

create or replace function public.admin_set_display_name(target uuid, next_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  update public.profiles
     set display_name = nullif(trim(coalesce(next_name, '')), ''), updated_at = now()
   where id = target;

  insert into public.account_audit (actor, subject, action, detail)
  values (auth.uid(), target, 'set_display_name', jsonb_build_object('name', next_name));
end;
$$;

revoke all on function public.admin_set_display_name(uuid, text) from public, anon;
grant execute on function public.admin_set_display_name(uuid, text) to authenticated;
