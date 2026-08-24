-- User accounts.
--
-- The guide moves from "open to anyone with the URL" to "sign in to read it".
-- Two tables' worth of thinking sits behind that:
--
--   * `profiles` holds the things a person may change about themselves, one row
--     per auth.users row, created by trigger so a profile can never be missing.
--   * `tier` and admin membership are NOT among those things. A signed-in user
--     who POSTs a crafted update must not be able to hand themselves the paid
--     tier, so the privileged columns are reverted in a BEFORE UPDATE trigger
--     rather than trusted to the client. `admins` already works this way
--     (20260822140000) and is left alone here.
--
-- What this does NOT do, said plainly so nobody is misled by it: the guide's
-- content — every location, species, rig and handling note — is compiled into
-- the JavaScript bundle and served as a static asset. The gate in front of it
-- is a UI gate. It makes the app require an account; it does not make the
-- content secret. Anything genuinely confidential would have to move behind
-- these policies as data, not ship in the bundle.

create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  display_name     text,
  -- 'free' | 'paid'. Read by the entitlements layer; writable only by an admin.
  tier             text        not null default 'free' check (tier in ('free', 'paid')),
  units            text        not null default 'imperial' check (units in ('imperial', 'metric')),
  -- Slug of the spot the reader treats as home water. No FK: locations sync
  -- from the bundle and a renamed slug must not break a person's account.
  home_slug        text,
  marketing_opt_in boolean     not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on column public.profiles.tier is
  'free | paid. Set by an admin or by billing. A user cannot write this to themselves — see profiles_guard().';

-- Every auth.users row gets a profile at creation. Doing this in the database
-- rather than in the client means a profile exists before the first render,
-- and exists for users created by an admin, by a magic link, or by a seed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the denormalised email in step when the account's email changes.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email, updated_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- The privileged-column guard. `using`/`with check` can say WHICH ROWS a user
-- may update; they cannot say which COLUMNS. So the row is allowed through and
-- the columns a user may not set are put back to what they were.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.id         := old.id;
    new.email      := old.email;
    new.tier       := old.tier;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.profiles_guard();

alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Deliberately no INSERT policy: rows come from the trigger, not the client.
-- Deliberately no DELETE policy: deleting a profile without deleting the
-- account would leave an account that cannot load. Account deletion goes
-- through the `delete-account` Edge Function, which removes the auth.users row
-- and lets the FK cascade take the profile with it.
revoke all on public.profiles from anon;

-- Admins are granted by the service role only. Seed the owner so there is
-- somebody who can reach the console after this migration; the row is keyed on
-- the auth user, so it attaches itself as soon as that address has an account.
insert into public.admins (user_id, email)
select id, email from auth.users where lower(email) = 'john.devenyns@gmail.com'
on conflict (user_id) do nothing;

-- ...and again for the case where the account is created after this runs.
create or replace function public.claim_seeded_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'john.devenyns@gmail.com' then
    insert into public.admins (user_id, email) values (new.id, new.email)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_admin on auth.users;
create trigger on_auth_user_created_admin
  after insert on auth.users
  for each row execute function public.claim_seeded_admin();
