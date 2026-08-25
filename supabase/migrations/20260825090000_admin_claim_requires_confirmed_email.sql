-- Admin may only be claimed by a *confirmed* owner address.
--
-- The original trigger (20260823120000_profiles_and_accounts.sql:139-157) fired
-- on `after insert on auth.users` and granted an `admins` row on nothing but a
-- string match against the owner's email. It never checked email_confirmed_at.
--
-- Three facts made that exploitable rather than merely sloppy:
--
--   1. The owner's address is hardcoded in this repository, and the repository
--      is public. The admin address is published, not guessed.
--   2. `docs/HANDOFF.md` instructs turning Supabase's "Confirm email" OFF to
--      unblock sign-ups. With confirmation off, anyone who signs up as that
--      address is immediately signed in holding full owner-console rights:
--      grant tiers, read every account, reset passwords, delete accounts.
--   3. auth.users.email is unique. Even with confirmation left on, a squatter
--      permanently blocks the real owner from ever registering the address and
--      leaves a live `admins` row waiting for the toggle in (2).
--
-- The fix splits the claim in two. Insert no longer grants anything. The grant
-- happens on confirmation, which requires control of the mailbox — so the
-- address alone is no longer proof of ownership.

-- Insert-time claim: gone. A row arriving unconfirmed grants nothing.
drop trigger if exists on_auth_user_created_admin on auth.users;

create or replace function public.claim_seeded_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only ever fires for the seeded owner address, and only once that address
  -- has been confirmed. Written to run on both INSERT and UPDATE so a provider
  -- that creates the user already-confirmed (OAuth, or an admin-created user)
  -- is still covered by the INSERT path below.
  if lower(coalesce(new.email, '')) = 'john.devenyns@gmail.com'
     and new.email_confirmed_at is not null
  then
    insert into public.admins (user_id, email) values (new.id, new.email)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

-- Confirmation-time claim. This is the path that normally grants admin.
drop trigger if exists on_auth_user_confirmed_admin on auth.users;
create trigger on_auth_user_confirmed_admin
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.claim_seeded_admin();

-- Covers the case where the user is created already confirmed.
drop trigger if exists on_auth_user_created_admin_confirmed on auth.users;
create trigger on_auth_user_created_admin_confirmed
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function public.claim_seeded_admin();

-- Retract any admin row that was granted to an unconfirmed account by the old
-- trigger. On a database where only the real owner has ever signed up this is a
-- no-op; where it is not a no-op, it is the whole point.
delete from public.admins a
using auth.users u
where a.user_id = u.id
  and u.email_confirmed_at is null;
