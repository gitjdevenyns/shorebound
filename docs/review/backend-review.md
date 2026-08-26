# Backend audit — Shorebound

Reviewer: backend-engineer (review-only pass). Scope: the 12 migrations in
`supabase/migrations/`, RLS on every table, auth/profiles/admin-role
mechanics, the audit table, and the 4 Edge Functions. No code, migrations, or
Supabase state were changed as part of this review.

Date: 2026-08-24.

---

## CRITICAL

### C1 — Anyone who signs up first with the owner's email address becomes admin, no email ownership proven

**Where:** `supabase/migrations/20260823120000_profiles_and_accounts.sql:139-157`
(`claim_seeded_admin()` + `on_auth_user_created_admin` trigger), corroborated
by `docs/HANDOFF.md:11-15` and `docs/HANDOFF.md:33-36`.

```sql
create or replace function public.claim_seeded_admin()
...
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
```

**The failure:** this trigger fires on `after insert on auth.users` — i.e. at
the moment Supabase Auth creates the row for a new sign-up — and it checks
only `new.email`. It does **not** check `new.email_confirmed_at`. Supabase
inserts the `auth.users` row immediately on `signUp()`, before the address has
been proven reachable; confirmation (if required at all) happens later via a
separate `UPDATE`, which this trigger does not listen for and does not need to
wait for.

**The concrete attack:** CLAUDE.md states "No users yet." The real owner
(`john.devenyns@gmail.com`) has not created an account yet. Anyone who signs
up at `/signin` using that exact email address — before the real owner does —
gets an `auth.users` row inserted with that email, the trigger fires
immediately, and `public.admins` gains a row for the attacker's `user_id`.
Two outcomes follow, both bad:

- If **Confirm email is off** — which is exactly what `docs/HANDOFF.md:14`
  instructs the owner to do to unblock sign-ups (`over_email_send_rate_limit`
  is currently breaking real sign-up) — the attacker's session is instantly
  usable. They are signed in, `is_admin()` returns true for their session, and
  they have full owner-console access: grant themselves/anyone the paid tier
  (`admin_set_tier`), read every account (`admin_list_users`), reset any
  password, change any account's email, delete any account
  (`admin-users` Edge Function), and read/write sponsorship and ad-listing
  billing data.
- Even with Confirm email **on**, the attacker permanently occupies
  `john.devenyns@gmail.com` in `auth.users` (unique per Supabase Auth), which
  **blocks the real owner from ever registering that address**, and leaves a
  live, unconfirmed `admins` row sitting in wait — one `confirm_user` click by
  the owner (who might reasonably assume this is their own stalled sign-up,
  since it is literally sitting under their own email in the accounts list)
  or one later toggle of Confirm-email-off turns it into full access.

This is not hypothetical: `docs/HANDOFF.md:34-36` documents that an
unconfirmed stray sign-up (`e2e1787538665780@gmail.com`) already exists in the
live database with a `profiles` row and no further gate — proof the
unconfirmed-insert-fires-triggers path is live and already used, just not
(yet) with the owner's address.

**Fix direction (flag only, not applied):** the trigger should require
`new.email_confirmed_at is not null`, or better, admin bootstrap should be a
one-time manual `insert into public.admins` (as already documented at
`app_config_and_admin.sql:85-91`) rather than an ambient trigger that keeps
matching on every future sign-up attempt against that address. As written,
the trigger is a standing landmine, not a one-time bootstrap.

---

### C2 — `admin_notes` (rates, contacts, renewal dates) is readable by anonymous users through the base tables, not just the safe views

**Where:**
`supabase/migrations/20260822160000_listings_and_ads.sql:69-81` (policies)
and `:93-107` (grants — note what's *missing*);
same pattern (superseded but same bug) in
`supabase/migrations/20260822120000_sponsorships.sql:44-59`.

```sql
-- listings_and_ads.sql
create policy "public read live listings"
  on public.shop_listings for select to anon, authenticated
  using (included and (starts_at is null or starts_at <= now())
                   and (ends_at is null or ends_at > now()));

create policy "public read live ads"
  on public.ad_campaigns for select to anon, authenticated
  using (active and starts_at <= now() and (ends_at is null or ends_at > now()));

revoke insert, update, delete on public.shop_listings from anon, authenticated;
revoke insert, update, delete on public.ad_campaigns  from anon, authenticated;
-- no `revoke select` here on either base table
```

**The failure:** Supabase grants `anon`/`authenticated` table-wide `SELECT`
on every new `public` table by default (this is why every other table in
these migrations only needs to `revoke insert, update, delete` — the `SELECT`
grant was never explicit because it doesn't need to be). RLS policies are
**row**-scoped, not **column**-scoped. `shop_listings.admin_notes` and
`ad_campaigns.admin_notes` are explicitly documented in the same file as
"Private: rate, contact, renewal date. Never exposed to anon" (line 35-36) —
but that promise is only kept by the `shop_listing_public` /
`ad_campaign_public` views (`:98-107`), which the app's own client code
correctly uses (`src/lib/useShopListings.ts:62`). The **base tables remain
directly queryable** by anyone holding the public anon key (which ships in
the bundle by design), for every row that satisfies the live-window filter.

**The concrete attack:** an anonymous caller (no login) sends:

```
GET {SUPABASE_URL}/rest/v1/shop_listings?select=shop_slug,admin_notes
GET {SUPABASE_URL}/rest/v1/ad_campaigns?select=id,advertiser,admin_notes
Authorization: Bearer <public anon key from the bundle>
```

and gets back the private rate/contact/renewal-date notes for every
currently live listing/ad — the exact data the comments in the migration say
must never reach a client. This is trivial, requires no authentication, and
works against production right now for any shop currently `included = true`
and in its date window (the 9 shops seeded live in
`20260822170000_seed_verified_shops.sql`).

**Fix direction:** either revoke table-level `SELECT` on the base tables from
`anon`/`authenticated` (forcing all public reads through the `*_public`
views, matching the stated intent), or add column-level `GRANT SELECT (...)`
that excludes `admin_notes`.

---

## IMPORTANT

### I1 — `identify-fish`'s CORS allow-list doesn't include the production domain; the feature is currently unusable from the live site

**Where:** `supabase/functions/identify-fish/index.ts:59-64`, contradicted by
`CLAUDE.md:9` ("Live at https://shorebound.fish") and
`docs/HANDOFF.md:6-7`.

```ts
const ALLOWED_ORIGINS = [
  "https://gitjdevenyns.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
];
```

`corsHeaders()` (`:228-239`) only echoes back `Access-Control-Allow-Origin`
when the request's `Origin` header is in this list. The live site is
`https://shorebound.fish` (Cloudflare Workers), which is not in the list.
`supabase/functions/identify-fish/README.md:136-138` still documents the
GitHub Pages origin as if it were the deploy target — this function and its
README were written before (or never updated after) the move to Cloudflare.

**Concrete failure:** a real visitor at `https://shorebound.fish` opens the
photo-ID page (`src/pages/IdentifyFish.tsx`), the browser sends a CORS
preflight `OPTIONS` with `Origin: https://shorebound.fish`, the function
returns 204 with no matching `Access-Control-Allow-Origin` header, and the
browser blocks the actual `POST` before it ever reaches the network tab as
anything but an opaque CORS failure. Per CLAUDE.md, photo species ID is one
of the things already "Built and deployed" — as shipped, it does not work
from the domain the product is actually live on.

**Fix direction:** add `"https://shorebound.fish"` (and any `www.` /
Cloudflare preview subdomain in use) to `ALLOWED_ORIGINS`, and update the
README's deploy note accordingly.

### I2 — `refresh-conditions` has no abuse control of its own; the public anon key is sufficient to call it

**Where:** `supabase/functions/refresh-conditions/index.ts` (whole file — no
rate limiting or extra authorization anywhere), `supabase/config.toml:6-9`,
acknowledged directly in
`supabase/migrations/20260810170000_schedule_refresh_conditions.sql:15-18`.

The function's only gate is `verify_jwt = true`, which accepts **any** valid
Supabase JWT — including the publishable anon key, which is shipped in the
client bundle by design (`src/lib/supabase.ts:7-9`). Unlike `identify-fish`
(which has three explicit rate-limit windows because it spends real money),
`refresh-conditions` has none, even though its whole design rationale
(`schedule_refresh_conditions.sql:1-8`) is "trivially polite" cadence toward
NOAA CO-OPS and NWS.

**Concrete failure:** anyone can `POST /functions/v1/refresh-conditions` with
`Authorization: Bearer <anon key>` as fast as they like. Each call issues up
to 9 CO-OPS requests and up to ~12 NWS gridpoint requests from the project's
shared egress IP. Repeated hammering risks the shared IP being throttled or
temporarily blocked by NOAA/NWS, which would degrade or blank the live tide
and forecast cards for every real visitor — a self-inflicted outage of a
"Built and deployed" feature, triggerable by anyone with the public key.

**Fix direction:** either restrict the function to the service role / a
shared secret bearer distinct from the anon key (rather than "any JWT"), or
add a lightweight cooldown (e.g., refuse to run again within N minutes of the
last successful run, tracked in a table) independent of the cron schedule.

### I3 — `claim_fish_id_slot()` has a check-then-act race under concurrency

**Where:** `supabase/migrations/20260810190000_fish_id_rate_limit.sql:73-103`.

The function does `select count(*) ... ` then, only if under the limit,
`insert into public.fish_id_requests`. These are separate statements inside
one PL/pgSQL function call; two concurrent invocations with the same
`caller_hash` (e.g. two tabs, or a client retry racing the original) can both
read the same pre-insert count under `READ COMMITTED` isolation and both be
allowed through, letting the per-hour/per-day cap be exceeded by a small
margin. There is no row lock, advisory lock, or unique constraint enforcing
the cap atomically.

Low severity: this is a soft cost-control, not an authorization boundary
(the design already treats IP as "not an identity" and leans on the global
daily cap as the real backstop, per the comment at lines 38-42), and the
overshoot per race is bounded to a handful of requests. Still worth a fix
given the function's whole purpose is bounding a real dollar cost.

**Fix direction:** `select ... for update` on a per-caller-hash advisory lock
(`pg_advisory_xact_lock(hashtext(p_caller_hash))`) before the count, or a
partial unique index plus `on conflict` retry loop.

---

## MINOR

### M1 — Six tide stations added by the sync migration are missing lat/lng/station_type

**Where:** `supabase/migrations/20260822130000_sync_locations.sql:38-47`
(stations `8726520`, `8726428`, `8726364`, `8726347`, `8726089`, `8726034`).

```sql
insert into public.tide_stations (id, name, url) values ('8726520', ...)
  on conflict (id) do update set name = excluded.name, url = excluded.url;
```

Only `id, name, url` are supplied. For rows that don't already exist, `lat`,
`lng`, `station_type`, `reference_station_id`, and `notes` are left `NULL`
(the `on conflict` clause also intentionally doesn't touch them for existing
rows, which is correct and non-destructive). Currently harmless — the only
client read (`src/lib/supabase.ts:156`) selects `id, name, url` and nothing
else — but it's a silent provenance gap in a project whose entire premise
(CLAUDE.md: "researched instead of guessed") is that this kind of metadata is
verified, not blank. Worth backfilling if `tide_stations.lat/lng` is ever
surfaced (e.g. a station map).

### M2 — `location_targets` is stale for 10 of the 25 locations and is dead code

**Where:** `supabase/migrations/20260809211000_seed_content.sql` (only seeds
`location_targets` for the original ~15 spots' worth of targets, and even
then not comprehensively) vs.
`supabase/migrations/20260822130000_sync_locations.sql` (adds 10 more
locations, `st-pete-pier`, `skyway-pier-north`, `fort-de-soto-gulf-pier`,
`fort-de-soto-bay-pier`, `egmont-key`, `weedon-island`, `pass-a-grille-jetty`,
`bunces-pass-shell-key`, `new-pass-ken-thompson`, `south-lido-park`, none of
which ever get a `location_targets` row in any migration).

`grep -rn "location_targets" src/` returns nothing — the table is not read by
any app code; the 104 species-per-spot recipes described in CLAUDE.md live
entirely in `src/data/` and ship in the bundle. So this is not a live
functional bug, but it is an orphaned, partially-seeded table that could
mislead a future engineer into treating it as a source of truth it no longer
is. Consider dropping it or documenting it as legacy/unused.

### M3 — Cron job URL is hardcoded to one project ref

**Where:**
`supabase/migrations/20260810170000_schedule_refresh_conditions.sql:31`
(`https://nwpuausjhqtvwmjprphc.supabase.co/functions/v1/refresh-conditions`).

If the Supabase project is ever recreated or transferred (disaster recovery,
ownership transfer), this migration's `cron.schedule` body still points at
the old project ref and fails silently — `net.http_post` errors are not
surfaced anywhere visible, so nobody notices until tide/weather cards go
stale past the "6 h = stale" threshold the client enforces. Not a migration
*failure* (the migration itself still applies cleanly), just an
operational trap. Worth a comment pointing at where to update it if the
project is ever moved.

---

## What was checked and found sound

- **All 12 migrations are ordered correctly** for their dependencies:
  `is_admin()` (20260822140000) is defined before every later migration that
  calls it; `admins`/`app_config` exist before `sponsorships`'s admin
  policies reference them; `profiles_and_accounts` (23rd) correctly comes
  after `app_config_and_admin` (22nd) even though both are "the 22nd/23rd"
  colloquially — the actual timestamps order correctly.
- **A fresh `supabase db reset` would succeed**: every `create table` uses
  `if not exists` or is a first-time create, every seed `insert` is
  idempotent (`on conflict do update`/`do nothing`), and the 25-location sync
  migration (`20260822130000`) is explicitly written to be safe against both
  an empty table and the original 15-row state.
- **RLS is enabled on every one of the 21 tables** created across these
  migrations; none are left RLS-on-with-no-policy in a way that would
  silently block legitimate reads (checked `tide_stations`, `fish`,
  `hazards`, `habitats`, `rigs`, `locations`, `location_targets`, `sources`,
  `source_links`, `weather_snapshots`, `tide_snapshots`,
  `fishing_report_snapshots`, `fish_id_requests`, `sponsorships`
  (superseded), `app_config`, `admins`, `review_decisions`, `shop_listings`,
  `ad_campaigns`, `profiles`, `account_audit`).
- **`profiles.tier` cannot be self-granted.** `profiles_guard()`
  (`20260823120000_profiles_and_accounts.sql:88-104`) reverts `id`, `email`,
  `tier`, and `created_at` to their old values on any `UPDATE` from a
  non-admin, run as a `BEFORE UPDATE` trigger — this correctly closes the gap
  that RLS `using`/`with check` alone cannot close (row-level, not
  column-level). Verified there is no `INSERT` policy on `profiles` at all
  (rows only come from the `handle_new_user()` trigger), and no `DELETE`
  policy (deletion is routed through `delete-account`, which cascades via the
  FK).
- **`account_audit` is genuinely append-only from the client's perspective.**
  RLS is enabled with a `SELECT`-for-admins-only policy and *no* `INSERT`,
  `UPDATE`, or `DELETE` policy at all — the only writers are the
  `SECURITY DEFINER` functions `admin_set_tier` / `admin_set_display_name`
  and the `admin-users` Edge Function (via the service role), all of which
  correctly write `actor` from the verified caller's own `auth.uid()` /
  token, never from a client-supplied field. A non-owner cannot write to or
  tamper with it through any client-reachable path.
- **`delete-account` and `admin-users` cannot be used to act on another
  account inappropriately, and `delete-account` specifically cannot ever
  target anyone but the caller.** `delete-account`
  (`supabase/functions/delete-account/index.ts:49-57`) resolves the subject
  **only** from the caller's own verified token (`caller.auth.getUser()`),
  never from the request body, and additionally requires the caller to
  retype their own email as a second factor before the irreversible delete
  (`:59-74`). `admin-users`
  (`supabase/functions/admin-users/index.ts:69-76`) checks admin membership
  by reading `public.admins` **through the caller's own RLS-scoped key**
  (not the service key) before doing anything, so a non-admin sees zero rows
  and is refused with 403 regardless of what `user_id` they put in the body;
  it also explicitly refuses `delete_user` and `confirm_user` when the
  `subject` equals the caller's own id, closing the "lock myself out" /
  "approve my own account" edge cases.
- **Secrets never reach the client.** `ANTHROPIC_API_KEY` and
  `SUPABASE_SERVICE_ROLE_KEY` are read only via `Deno.env` inside Edge
  Functions; grepped `src/` for any reference to a service-role key or
  non-`VITE_`-prefixed secret and found none. `identify-fish` never persists
  the uploaded photo anywhere (memory-only, per its own comments and
  confirmed by the code — no Storage call, no table insert of image data).
- **Input validation on `identify-fish`** is real, not decorative: request
  body size cap (2.2 MB), decoded-image byte cap (1.5 MB) checked after
  read (deliberately, to avoid hanging half-sent connections — reasoned out
  in comments at `:305-323`), base64-alphabet validation, and an explicit
  allow-list of media types.
- **Rate limiting on `identify-fish`** is checked *before* the paid Claude
  call in all cases, including when the rate-limiter's own DB call fails
  (fails closed — `503`, not an open tap), which is the correct fail-safe
  direction for a cost-bearing endpoint.

---

## Summary for the architect / test-engineer

Two of the findings above (C1, C2) are exploitable **today**, need no special
access, and should be prioritized above anything else in this review. One
(I1) is not a security bug but is a currently-broken, already-shipped
feature on the live domain and should be treated with similar urgency since
it's silently costing the product one of its stated built features.
