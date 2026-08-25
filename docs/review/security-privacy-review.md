# Security & privacy review — Shorebound

Reviewed 24–25 Aug 2026. Read-only audit, organised against NIST CSF 2.0.
Scope: the two priority questions (bundle-secrecy assumptions; secrets in the
bundle), plus location handling, PII and admin exposure, and Edge Function
authorization.

> Recorded after the fact from the reviewer's report, so the timeline and the
> other five audits have a complete set. Findings marked **FIXED** were closed
> in the same session — see the fix note under each.

---

## The two priority questions

### Can a secret reach the bundle? **No — and this was verified against production, not just a local build.**

- `.env.local` holds a live service role key. It is gitignored (`.gitignore:20-22`)
  and **has never been committed** — every commit on every ref was searched for
  the literal key value, for `sb_secret_`, `sk-ant-`, `AIza`, PEM headers and
  three-part JWTs. Only variable *names* appear in history, never values.
- `vite.config.ts` has no `define` block and no `process.env` injection. Only
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are declared
  (`src/vite-env.d.ts:5-6`).
- The **live** production chunks were downloaded from
  `https://shorebound.fish/assets/` and grepped. Zero hits for service-role
  keys, JWTs, Anthropic keys or SMTP credentials. The only key present is
  `sb_publishable_…`, which is public by design.

### Does anything else assume the bundle is secret? **Yes — two things.**

The *application* reasoning about the account gate is careful and consistent
(`src/lib/auth.tsx:7-15`, `src/lib/entitlements.ts:3-21`, `src/admin/Gate.tsx:6-17`,
`supabase/migrations/20260823120000_profiles_and_accounts.sql:14-21` all state it
correctly). The failures are in the **infrastructure** layer, where the same
discipline was not applied — see PR-1 and PR-5.

---

## GOVERN

**GV-1 — MINOR — the production deploy path has no secret-leak guard, but the docs claim it does.**
`README.md:81-82` says CI greps `dist/` and fails the deploy on a hit. The grep
is real (`.github/workflows/deploy.yml:76-82`) but lives in the **GitHub Pages**
workflow, which its own header declares superseded. Production deploys via
`wrangler deploy` and never runs it. The pattern
(`service_role|SUPABASE_SERVICE_ROLE_KEY|ANTHROPIC|sk-ant-`) would also miss the
new-format `sb_secret_…` key actually in use.

**GV-2 — IMPORTANT — sales material marked "private" is listed in a public repo.**
`docs/HANDOFF.md:85-95` lists claude.ai artifact IDs under "Published pages
(private until shared)" — the deck, the build-cost estimate, the listing
comparison. The repository is public. If those URLs are link-accessible, pricing
and cost material is effectively published.

**GV-3 — MINOR** — no `SECURITY.md`, no disclosure path, no key-rotation runbook,
no named owner for security decisions.

---

## IDENTIFY — data inventory

| Store | Contents | Exposure |
|---|---|---|
| `auth.users` | email, password hash, timestamps | Own row only |
| `public.profiles` | email, display_name, tier, units, home_slug, marketing_opt_in | RLS: own row or admin |
| `public.account_audit` | actor/subject UUIDs, action, `detail` jsonb (contains emails) | RLS: admin read only |
| `public.fish_id_requests` | HMAC(IP), timestamp | RLS on, no policies — service role only |
| `public.shop_listings` | advertiser rates/contacts in `admin_notes` | **anon-readable — PR-2** |
| localStorage | session JWT, theme, tier flag, listing cache | Device |
| CacheStorage | **every Supabase GET incl. profile — PR-6** | Device |

No payment data, no health data, no children's data. Location is never persisted.

---

## PROTECT

### CRITICAL

**PR-1 — `refresh-conditions` is invokable by anyone, using the public anon key.**
`supabase/config.toml:6-9` sets `verify_jwt = true`, and
`supabase/migrations/20260810170000_schedule_refresh_conditions.sql:14-18`
reasons from it: *"The anon key is sufficient: the function has verify_jwt = true
(so the endpoint is not open to the world)"*. The premise is false — the
scheduled caller's bearer token **is** the anon key (same file, line 12), and
that value ships in the public bundle. The function body ignores the request
entirely (`refresh-conditions/index.ts:89` is `Deno.serve(async (_req) => {`), so
there is no second check. An unauthenticated POST returns
`401 UNAUTHORIZED_NO_AUTH_HEADER`, confirming the platform gate is the only control.

*Exploit.* Anyone, no account: copy the anon key from the JS bundle, then POST to
`/functions/v1/refresh-conditions` in a loop. Each call makes ~9 NOAA + ~12 NWS
fetches (3-attempt backoff each) and ~21 inserts. They get: unbounded function
invocations and DB writes billed to the owner; sustained hammering of
`api.weather.gov` and `api.tidesandcurrents.noaa.gov` from Supabase egress IPs
under a User-Agent naming Shorebound (`index.ts:34`) — NWS blocks abusive
User-Agents, and losing that feed takes live forecast off all 25 spots; and
unbounded growth of the snapshot tables.

The contrast with `identify-fish` is the proof: that function's config comment
(`supabase/config.toml:11-16`) states the rule correctly — *"the JWT gate keeps
out unauthenticated traffic but is NOT the abuse control — the anon key ships in
the bundle by design"* — and backs it with `claim_fish_id_slot()` before spending
money. `refresh-conditions` asserts the opposite and has no ledger and no cap.

**PR-2 — advertiser rates and contacts (`admin_notes`) readable by anonymous users. FIXED.**
`20260822160000_listings_and_ads.sql:93-94` revokes only `insert, update, delete`.
`SELECT` was never revoked, and the RLS policy is row-scoped, not column-scoped.
The `shop_listing_public` view withholds the column, but nothing forced anyone
through the view.

*Verified against production* with the bundled anon key:
`GET /rest/v1/shop_listings?select=shop_slug,tier,admin_notes` → 200, 9 rows,
`admin_notes` returned. Latent only because no deal exists yet and every value is
null; it begins leaking the first time a rate is typed, with no code change and
no signal.

> **FIXED** — `20260825091000_lock_admin_notes_and_restore_admin_writes.sql`
> revokes blanket SELECT, grants back only the public columns (so the
> `security_invoker` views keep working), and routes admin reads through
> `admin_list_shop_listings()` / `admin_list_ad_campaigns()`, security definer
> functions that check `is_admin()`. The same migration grants back
> `insert, update, delete` to `authenticated` — those had been revoked too, and
> because RLS cannot restore a missing table grant, the owner console's Save had
> been failing at the grant layer before any policy ran.

### IMPORTANT

**PR-3 — photo fish ID broken in production; CORS allowlist omits the production origin. FIXED.**
`identify-fish/index.ts:59-64` listed `gitjdevenyns.github.io` and three
localhosts; `https://shorebound.fish` was absent. Verified against the deployed
function: preflight from the production origin returned 204 with **no**
`access-control-allow-origin`, while the GitHub Pages origin got one. The client
sends `Content-Type`, `apikey` and `Authorization` (`src/lib/identify.ts:203-213`),
so a preflight is mandatory and the browser blocked the POST. The failure landed
in the generic catch and told the user "Could not reach the identification
service" — permanently, and misleadingly.

`src/test/functions.cors.test.ts` passed throughout, because it asserted only
`Access-Control-Allow-Headers` and never the origin list.

> **FIXED** — production origin added; the test now asserts the origin list too.

**PR-4 — the only capability marked `enforced: true` is not enforced at the value claimed.**
`src/lib/entitlements.ts:143-150` declares `identify.perDay` free 2 / paid 20,
`enforced: true`. The server is tier-blind: `identify-fish/index.ts:365` calls
`claim_fish_id_slot()` with no tier, so the SQL defaults apply to everyone —
6/hour, 20/day, 250/day global. There is no client-side check either. **Everyone
gets 20/day.** The cost ceiling is genuinely bounded (~$6.50/day), so this is not
a billing risk — but `marketing/sales/pitch-deck.md:405-407` repeats the fiction
to investors.

**PR-5 — the one wired capability reads a client-writable flag, and it is the v1 revenue line.**
Of 13 declared capabilities, exactly one has a consumer: `AdSlot` checking
`ads.enabled` (`src/components/AdSlot.tsx:30-31`). It resolves tier from
`localStorage['shorebound.tier']` (`src/lib/useEntitlements.ts:28-35`), not from
the RLS-protected `profile.tier`. `useTierFromAccount()` exists
(`src/lib/auth.tsx:407-410`) and has no callers. One devtools line —
`localStorage.setItem('shorebound.tier','paid')` — removes advertising the owner
has invoiced someone for. `useEntitlements.ts:20-25` argues the override "is not
a paywall bypass, because there is nothing to bypass" — true for *content*, false
for *ads*.

**PR-6 — the service worker caches the signed-in user's PII, and sign-out does not purge it. FIXED.**
`vite.config.ts:167-180` registered a `NetworkFirst` rule on
`/^https:\/\/[a-z0-9-]+\.supabase\.co\/.*/i` — the whole origin, not just the
tide/weather reads the comment anticipated. `/rest/v1/profiles?select=…` and
`/auth/v1/user` therefore landed in CacheStorage for 24 hours. `signOut()`
(`src/lib/auth.tsx:320-328`) clears React state and the Supabase session but never
touches Cache Storage. On a shared device, user A's email, display name, home spot
and tier stayed readable after sign-out. On the owner's device the same rule
cached `shop_listings` rows, `admin_notes` included.

> **FIXED** — the rule is now an allowlist of read-only, non-personal endpoints
> (`locations`, `tide_latest`, `weather_latest`, `shop_listing_public`,
> `ad_campaign_public`, `app_config`). Auth and Edge Function calls go unrouted.
> `src/test/sw.cache.test.ts` fails if the pattern is ever widened again.

**PR-7 — no CSP and no HSTS on the production response.**
`public/_headers:24-30` sets `X-Content-Type-Options`, `Referrer-Policy` and
`Permissions-Policy` (the `geolocation=(self)` choice is exactly right). Missing:
`Content-Security-Policy`, `Strict-Transport-Security`, `frame-ancestors`.
Confirmed live. This matters more than usual because the session JWT lives in
localStorage and the owner console shares the origin — a single XSS yields the
token and, for the owner, the `admin-users` endpoint.

### Verified correct, and worth not breaking

- **Location never leaves the device.** Every consumer of `geo.coords` was traced
  (`Home.tsx:241-268`, `Shops.tsx:24-33`, `Start.tsx:44-53`, `NearYou.tsx:34-44`);
  all feed `rankNearby()` / `milesBetween()`, pure arithmetic over bundled data.
  The only outbound calls are `identify-fish` (image only), `delete-account` (own
  email) and `admin-users` (admin body). No analytics, no beacons, no position
  logging.
- **EXIF GPS is stripped.** `src/lib/image.ts:96-115` decodes via
  `createImageBitmap`, draws to a canvas and re-encodes — a canvas re-encode
  carries no EXIF. Load-bearing: a pass-through fast path for small files would
  silently reopen the leak.
- **Admin authorization is server-side.** Every console read goes through a
  `security definer` function that re-checks `is_admin()`
  (`20260823140000_admin_user_management.sql:44-48, 105-107, 139-142, 163-166`).
  `admin-users` re-derives the caller from their own token and checks the `admins`
  row with the **caller's** key so RLS decides (`admin-users/index.ts:59-76`).
  `delete-account` takes no user id from the body. `admin_list_users` excludes
  password hashes and recovery tokens.
- **RLS verified empirically** with the anon key: `profiles`, `admins`,
  `account_audit`, `fish_id_requests` all return 401. `profiles_guard()` reverts
  `tier`/`email`/`id` on any non-admin update, so a crafted PostgREST call cannot
  self-grant paid.
- **Ranking integrity holds.** `rankNearby()` takes only locations, coordinates
  and tide stage — no listing, sponsorship or payout input. In the shop directory
  payment *does* affect order via `directory_rank`, but a non-zero rank requires a
  live `enhanced` listing and `ShopCard` renders the `Sponsored` tag from the same
  condition with no prop to suppress it. Nothing can float up unlabelled.
- **Media licensing** — CC BY / CC BY-SA images carry author, licence and source,
  enforced by `src/test/media.test.tsx`.

---

## DETECT

Thin, and said plainly rather than scored as covered. No auth-failure logging, no
alerting on invocation volume, no anomaly detection on the rate-limit ledger,
nothing that would surface PR-1 being exploited — the first signal would be a
Supabase bill or NOAA/NWS returning 403s. `account_audit` is a genuine audit trail
for admin actions on accounts, and covers only that surface.

One cheap gap: `claim_fish_id_slot` returns `scope: 'global'` when the 250/day
backstop trips, and the function returns it to the client — but nothing notifies
the owner. Hitting the global cap is the abuse signal, and today it is invisible.

---

## RESPOND / RECOVER

No incident response plan, no breach notification path, no key rotation procedure.
Expected at this stage; flagged so it is tracked.

- **Rotating the service role key silently resets every rate-limit counter**,
  because the key doubles as the HMAC pepper (`identify-fish/index.ts:258-269`).
  Harmless in itself, but it couples rotation to abuse response: rotating during
  an active incident hands the attacker a fresh quota.
- **Account deletion does not reach `account_audit`.** `delete-account` removes
  the `auth.users` row and lets the FK cascade take `profiles`. `account_audit`
  has no FK and no cleanup, and `detail` retains emails for admin-initiated
  actions. `src/pages/Privacy.tsx:57-62` promises deletion leaves "nothing kept
  back" — for any user the owner touched from the console, that is untrue.

---

## Privacy policy accuracy — IMPORTANT

The policy is unusually good: written from the code, specific, falsifiable, and
correct about location and photos. Three defects:

1. **`src/pages/Privacy.tsx:127` names the wrong host** — "Hosting is GitHub
   Pages." Production is Cloudflare. This is a subprocessor disclosure naming the
   wrong company.
2. **`Privacy.tsx:177-178` disclaims the ability to answer a data-subject
   request** — "we have no record of you to produce, correct or delete" — on a
   page that spent three paragraphs describing the account record it holds.
   `161-163` repeats it. These lines predate accounts.
3. **`Privacy.tsx:106-112` understates on-device storage** — omits the session
   token and the cached profile (PR-6).

---

## Third-party data rights — IMPORTANT

- **OpenStreetMap public tiles** (`src/components/MapView.tsx:87-89`) — the OSMF
  Tile Usage Policy targets low-volume and OSM-related use; a commercial,
  ad-supported, store-bound app is a poor fit, and `{s}` subdomain sharding is
  deprecated. Attribution is present and correct; the issue is the terms.
- **Esri World Imagery** (`MapView.tsx:91-94`) — used with no API key or developer
  account. Esri's basemap terms generally require a subscription for third-party
  application use.

NOAA CO-OPS and NWS are US Government public domain, correctly attributed and
politely rate-limited at the scheduled cadence — no issue, *provided* PR-1 is fixed.

---

## MINOR

- `admin-users` and `delete-account` use `Access-Control-Allow-Origin: '*'` while
  `identify-fish` uses an allowlist. Not exploitable (bearer token required, no
  cookies) but inconsistent on the two endpoints that can delete an account.
- **Dangling references to `src/lib/sponsorship.ts`**, replaced by `listings.ts`:
  `entitlements.ts:171`, `src/data/shops.ts:8`, `docs/OPS_BACKLOG.md:57`. One is
  the pointer to where sponsored-label enforcement supposedly lives.
- **`verification: 'needs_check'` has no code linkage to `included`.**
  `src/data/shops.ts:28-32` says unconfirmed shops should not reach readers, but
  the filter is purely the owner-set `included` flag. One mis-click publishes an
  unverified address.
- **Stale host references** across `README.md:8,140-147`, `vite.config.ts:28`,
  `public/_headers:1`, `docs/ROADMAP.md:35`, `src/data/contact.ts:13`. PR-3 was a
  direct consequence of exactly this drift.

---

## Requires a human specialist — NOT resolved by this review

- **Lawyer — vendor terms.** OSM Tile Usage Policy and Esri ArcGIS Online terms,
  read against a commercial ad-supported app heading for the App Store.
- **Lawyer — privacy policy.** `Privacy.tsx` needs a rewrite for the account era;
  the DSAR disclaimer must go. Which regime applies is a legal determination.
- **Lawyer — FTC disclosure adequacy.** Sponsored placement *is* labelled
  structurally with no suppression path, which is the hard part. Whether wording,
  placement and prominence satisfy the Endorsement Guides is a legal judgment.
- **Lawyer — competitor naming.** `marketing/sales/pitch-deck.md:201` names
  Fishbrain and others with pricing.
- **Penetration tester — before any public launch or store submission.** This was
  a code review, not an adversarial test.
- **Licensed auditor — not yet.** No SOC 2 / PCI exposure today because there is
  no payment handling. If a paid tier ships, keep card data with Apple/Google/
  Stripe and never in this stack.

---

## Verdict

**NO-GO for a public-launch or store-submission milestone. GO to continue development.**

Blocking for launch, as assessed: **PR-1**, **PR-2**, **PR-3**.
PR-2 and PR-3 are now fixed (see notes above); **PR-1 remains open.**

Should ship with launch: PR-6 (fixed), PR-7, and the three privacy-policy corrections.

Should be corrected regardless of milestone, because they are false statements
about the system rather than vulnerabilities in it: PR-4, PR-5, GV-1.
