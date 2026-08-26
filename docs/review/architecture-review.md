# Architecture review — where the shape is wrong

**Date:** 24 August 2026
**Scope:** whole-system structural review against the five hard constraints in
`CLAUDE.md`. Not a code review. No new capability proposed — `docs/ROADMAP.md`
governs and everything below is about the structural soundness of what already
exists.

**Method:** read `CLAUDE.md`, `README.md`, `docs/ROADMAP.md`, `docs/HANDOFF.md`,
`docs/LESSONS_LEARNED.md`, then the module boundaries (`src/pages`,
`src/components`, `src/lib`, `src/data`, `src/admin`), `vite.config.ts`,
`wrangler.jsonc`, `.github/workflows/deploy.yml`, `public/_headers`, the four
Edge Functions, the rate-limit migration, and the test suite's boundary tests.

---

## The one-line finding

The app's *internal* shape is unusually good — the boundaries that matter are
declared, commented with their failure history, and in two cases enforced by
tests. What has gone wrong is at the **edges**: the rename from a GitHub Pages
project path to `shorebound.fish` moved the app but did not move the deploy
gate, the Edge Function origin list, or the support domain. And a second layer —
the account gate — was added on top of an offline-first product without the
offline case being answered.

Six CRITICAL items. Five of the six are edge/seam problems, not internals.

---

## CRITICAL

### C1. Production deploys through a path with no gate at all

`.github/workflows/deploy.yml:1-5` opens by documenting that its own output
"cannot resolve at gitjdevenyns.github.io/shorebound/" because the app now
builds with `base: '/'`. It still fires on every push to `main`
(`deploy.yml:20-23`). The deploy that actually serves `shorebound.fish` is
`wrangler deploy` (`package.json:16`, `wrangler.jsonc`) and **no workflow in the
repo runs it.**

Everything the project relies on to stay honest is bolted to the dead target:

- `npm test` (`deploy.yml:49-50`)
- `tsc --noEmit && vite build` (`deploy.yml:64-65`)
- the service-role / `ANTHROPIC` / `sk-ant-` grep over `dist/`
  (`deploy.yml:76-82`)

`README.md:81-82` states "CI greps `dist/` for it and fails the deploy on a hit."
That sentence is false for the deploy that serves users. Constraint 5's *stated*
enforcement mechanism does not run on production, and "green or revert" is
enforced by discipline only.

This is also two live sites again — the exact class of failure
`docs/LESSONS_LEARNED.md:99-106` was written about, one layer up.

**Shape fix:** one workflow, one deploy target. Move the test + typecheck +
secret-grep steps in front of `wrangler deploy` and delete or disable the Pages
workflow. If Cloudflare's own Git integration is what deploys, then the checks
have to move into that build command, because a check that does not sit in front
of the artifact that ships is decoration.

---

### C2. The account gate bricks the guide offline for a signed-out reader

`src/App.tsx:57-75` wraps every content route in `Gated`. `RequireAuth`
resolves `'out'` to `<Navigate to="/signin">` (`src/components/RequireAuth.tsx:36-39`).
`src/pages/SignIn.tsx` offers exactly two links — create an account, forgot your
password (`SignIn.tsx:38-40`). There is no guest path, no "browse without an
account", no offline branch. A repo-wide grep for `guest|browse without|skip`
finds nothing.

So: install the PWA (or the TWA/iOS wrapper), open it for the first time at the
pass with no signal, and the product is a login form that cannot complete.
Every one of the 25 spots, 11 species pages and 104 recipes is already sitting
on the device, precached, unreachable.

`CLAUDE.md` constraint 1: *"Degrading gracefully is fine; blocking the app is
not."* This blocks the app.

Two things follow from it:

- **`/care` is gated** (`App.tsx:75`). `src/lib/entitlements.ts:94` states the
  rule in the strongest terms in the repo: *"NEVER GATE THIS. Someone grabs a
  catfish or a stingray whether or not they paid... it is the one gate that
  could genuinely hurt a person."* The account gate is not the paywall, but it
  is a gate, and the person it stops is the same person. `CLAUDE.md` also says
  safety is "led with rather than buried."
- **The App Store 4.2 argument weakens.** `docs/ROADMAP.md:88-92` builds the
  case against "repackaged website" on bundled offline content plus camera ID
  plus geolocation ranking. A reviewer who opens the app in airplane mode with a
  fresh install sees a sign-in wall. The strongest evidence for the case is the
  thing the gate hides.

**Shape fix — the decision to make, not for me to make alone:** the gate is
documented as a sign-up driver (`docs/HANDOFF.md:74-77`), and it works as one
online. Offline it has nothing to drive. The structural options:

1. **Gate on first *online* launch only.** Once a reader has been through the
   gate, the session is local and survives (`auth.tsx:98-106` already does
   this). If there has never been a session *and* there is no connection, let
   them into the guide. Preserves the sign-up funnel exactly, because a reader
   with no connection could not have signed up anyway.
2. **Ungate the safety and legal surface permanently** — `/care`, `/privacy`,
   `/support`. The latter two already are (`App.tsx:73-74`); `/care` should
   join them regardless of which option is taken.
3. Leave it, and accept that the offline-first claim has an asterisk. Not
   recommended — it is the product's defining feature and the App Store case.

Recommend 1 + 2. Optimising for: not shipping a store product whose headline
feature fails on first launch.

---

### C3. `identify-fish` does not allow the production origin

`supabase/functions/identify-fish/index.ts:59-64`:

```
const ALLOWED_ORIGINS = [
  "https://gitjdevenyns.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
];
```

`https://shorebound.fish` is absent. `corsHeaders()` only emits
`Access-Control-Allow-Origin` when the origin is on that list
(`identify-fish/index.ts:235-237`). The client posts JSON with `apikey` and
`Authorization` headers (`src/lib/identify.ts:203-213`), which is a preflighted
request. The preflight gets a 204 with no `Access-Control-Allow-Origin` and the
browser never sends the POST.

Photo ID is one of the two features carrying the App Store 4.2 case
(`ROADMAP.md:88-92`) and it cannot be called from the live site.

The shape lesson underneath it: `src/test/functions.cors.test.ts` exists and is
good — it guards the *header* list because that is what broke last time
(`functions.cors.test.ts:6-18`). It does not guard the *origin* list. The test
was written to the last bug rather than to the contract.

**Shape fix:** add the production origin, and extend
`functions.cors.test.ts` to assert that every browser-callable function names
the deploy origin. Better: derive the origin list from one place rather than
hand-maintaining it per function — the same rename will happen again.

---

### C4. The shop directory — v1's only revenue line — vanishes offline

`src/lib/useShopListings.ts:75-77`:

```
const shops: ListedShop[] = SHOPS
  .filter((s) => byslug.get(s.slug)?.included)
```

`byslug` is built from `listings`, which comes from a Supabase read of
`shop_listing_public` (`useShopListings.ts:62`). With no network and no prior
successful load, `listings` is `null`, `byslug` is empty, and **every shop is
filtered out**. The directory renders empty.

Three problems stacked:

1. **Constraint 1.** Twenty researched, bundled, verified businesses are on the
   device and are shown only if a network read succeeds. The reader who needs
   "where do I buy shrimp" is on a beach with one bar — the module's own
   docstring says so at `useShopListings.ts:11-13`.
2. **The advertiser is buying exposure that silently disappears.**
   `docs/ROADMAP.md:16-21` makes "the first bait shop paying for a listing" half
   the definition of done. The pitch is an offline guide; the product the shop
   pays for is online-only.
3. **`LESSONS_LEARNED.md:99-106` recurring verbatim.** A shop missing from
   `shop_listing_public` and a shop unreachable because the reader is offline
   render identically — as absence, with no error. That is the `locations`
   table drift, in a second table, with the same failure signature.

The stated reason for remote-gating presence (`useShopListings.ts:19-21`:
showing unconfirmed businesses would put unverified addresses in front of
readers) **is already solved in the bundle.** `src/data/shops.ts:53` carries
`verification: 'verified' | 'needs_check'` on every row.

**Shape fix:** invert the default. Bundled `SHOPS` filtered to
`verification === 'verified'` is the source of truth for *presence*; the
Supabase row is an *overlay* that can suppress a shop, promote it to enhanced,
and set its rank. `included: false` becomes a suppression, not a precondition.
The editorial safety property is preserved, the offline case is answered, and a
missing row stops being indistinguishable from being offline. `listings.ts:80-87`
already describes `included` as editorial and independent of `tier` — this makes
the code match that description.

---

### C5. The one capability that claims to be enforced is enforced at a different number, and read by nothing

`src/lib/entitlements.ts:140-146` declares:

```
id: 'identify.perDay', free: 2, paid: 20, enforced: true,
note: '...enforced in Postgres before the paid model call... a genuine cost
control, not packaging.'
```

What the server actually enforces
(`supabase/migrations/20260810190000_fish_id_rate_limit.sql:48-52`): 6/hour and
20/day **per IP hash**, 250/day globally. There is no tier in it. There cannot
be: the client posts only the anon key, never a user JWT
(`src/lib/identify.ts:206-209`), so the function has no idea who is calling.

And a grep for `identify.perDay` across `src/` returns exactly one hit — its own
declaration. Nothing reads it. **There is no free-tier cap of 2/day anywhere in
the system.** Every caller, signed in or not, gets 20/day.

The exposure is bounded and that bound is real and well-built — 250/day ×
$0.026 ≈ $6.50/day, ~$200/month worst case, claimed in Postgres before any
money is spent, in one transaction, service-role only. That part is sound. The
problem is that `entitlements.ts` is the file the owner would open to reason
about cost, and it states a control that does not exist, flagged `enforced:
true` to distinguish it from the twelve that are honest about being soft.

**Shape fix:** either set `enforced: false` and state the real ceiling in the
note, or make the number true by having the function read the caller's JWT and
look up `profiles.tier`. The first is a five-minute change and correct for v1
(which ships free). The second is the v1.1 shape and should not be built now.
What must not stand is a false `true` in the cost-control registry.

---

### C6. The service worker caches Supabase by hostname, not by data class

`vite.config.ts:169`:

```
urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/.*/i,
handler: 'NetworkFirst',
options: { cacheName: 'shorebound-supabase', ... maxAgeSeconds: 60*60*24 }
```

The comment above it says "Dynamic content (future cached weather/tide
snapshots)". The pattern matches far more than that. Every GET to the Supabase
host lands in a durable Cache Storage entry for 24 hours, including:

- `/auth/v1/user` — the signed-in user's identity
- `/rest/v1/profiles?id=eq.<uuid>` — email, display name, tier, home spot
  (`src/lib/auth.tsx:179-183`)
- `/rest/v1/admins?user_id=eq.<uuid>` (`auth.tsx:184`)

Cache Storage is not touched by `signOut()` (`auth.tsx:287-294`), which clears
React state and the SDK's localStorage and nothing else. On a shared or handed-on
device, a signed-out user's email and profile sit readable in Cache Storage for
24 hours. It is also a correctness hazard: a stale cached identity can be served
back after an account change.

This is a shape error rather than a bug — the route is keyed on *where the data
lives* instead of *what class of data it is*. The two things the offline story
actually needs cached are `tide_latest` and `weather_latest`.

**Shape fix:** narrow the pattern to the read views the guide needs offline
(`/rest/v1/tide_latest`, `/rest/v1/weather_latest`, and
`/rest/v1/shop_listing_public` once C4 lands), and let `/auth/v1/*`,
`/functions/v1/*` and everything else go to the network unrouted. Verify in a
browser afterwards — `CLAUDE.md` is right that this class of thing is invisible
in source and obvious in devtools.

---

## IMPROVABLE

### I1. Two `Tier` types, two tier sources, and the wrong one wins

`src/lib/entitlements.ts:29` declares `Tier`. `src/lib/auth.tsx:37` declares
`Tier` again. `useEntitlements()` — the hook that answers "what can this reader
do" — takes its tier from `useTier()`, which reads
`localStorage['shorebound.tier']` (`useEntitlements.ts:28-47`).
`useTierFromAccount()`, which reads the server-vouched `profiles.tier`
(`auth.tsx:386-389`), has **zero callers**.

`useEntitlements.ts:20-26` is candid that this is a dev override awaiting
billing, and there is genuinely nothing to bypass today. But the seam is
pointing the wrong way: the file that will "be the one function that changes"
when billing lands currently does not consume the only real answer that already
exists. Collapse to one `Tier` type and have `useEntitlements` prefer the
profile tier when a profile is loaded, falling back to the local override only
when there is none. Small, and it makes the eventual billing change a deletion.

### I2. The entitlements matrix is a control surface wired to nothing

Thirteen capabilities are declared (`entitlements.ts:70-181`). Grepping every
capability id across `src/`: only `ads.enabled` is consulted anywhere, in
`AdSlot.tsx:31` — and **`AdSlot` itself has no call sites** (grep for `AdSlot`
returns the definition, two comments and a CSS rule). So zero of thirteen
capabilities change anything a reader sees.

The owner console has a free/paid matrix screen that writes `app_config`,
`mergeMatrix` merges it correctly, and the result reaches no rendering decision.
Setting `locations.count.free = 3` in `/admin` does nothing.

For v1 this costs nothing — v1 ships free with everything on
(`ROADMAP.md:113-117`) and the roadmap explicitly parks the paid tier. It is
listed here rather than as CRITICAL for that reason. But the console should not
present a lever that is not attached; at minimum the matrix screen should say,
on the screen, that these values are staged and not yet enforced. The same
applies to `AD_SLOTS` (`listings.ts:134-139`), described in its own comment as
"the rate card" — four sellable slots, no renderer for any of them. The console
will happily assign a campaign to inventory that cannot render.

### I3. CI runs the test suite in a configuration the product never ships in

`src/test/setup.ts:11-21` explains that the suite runs as a signed-in reader
because `.env.local` gives the test build a Supabase config, "so the account
gate is live in here exactly as it is in production."

That holds locally. `.env.local` is not committed, and `deploy.yml:49-50` runs
`npm test` with no env at all — the Supabase vars are passed to the *build* step
only (`deploy.yml:66-68`). So in CI `isSupabaseConfigured()` is false, auth
status is `'disabled'`, and `RequireAuth` waves everything through
(`RequireAuth.tsx:16-18`). The gate is exercised locally and stubbed out in CI,
and both report green for different reasons.

Fix by pinning the test environment explicitly in `vite.config.ts`'s `test`
block rather than depending on a developer's untracked file. This one matters
more than it looks: it is why C2 has no failing test.

### I4. `check:db-sync` guards the drift that already happened, and runs only if remembered

`package.json:14` defines it; `LESSONS_LEARNED.md:99-106` records why it exists.
Nothing references it — no workflow, no release checklist, no docs step. It
cannot go in `npm test` (network), which is correct, but it needs a home: a
pre-release checklist in `ROADMAP.md`, or a scheduled workflow that opens an
issue on drift. A guard that depends on memory is the same guard that was
missing when the drift happened.

### I5. `README.md` is stale in load-bearing ways

`CLAUDE.md:57` names `README.md` as the architecture-and-content-rules
reference. It currently says the live site is `gitjdevenyns.github.io/GCF/`
(`README.md:8`), the router base path is `/GCF/` (`README.md:12`), dev runs at
`localhost:5173/GCF/` (`README.md:88`), the deploy model is GitHub Pages
(`README.md:139-148`), and the verified state is 243 tests (`README.md:154`)
against `HANDOFF.md:5`'s 316. It also does not mention accounts, which changed
the app's whole entry shape. Anyone — human or agent — briefed on this file
starts from a wrong model of the system. (Note: a documentation specialist is
running in parallel; this is flagged for structural impact, not to duplicate
that lane.)

### I6. Two code comments disagree about the SPA fallback mechanism

`vite.config.ts:12` says "Cloudflare Pages serves it from `public/_redirects`."
There is no `public/_redirects`, and `wrangler.jsonc:10-15` says there
deliberately is not one and never can be (`/*` self-matches and Cloudflare
rejects the deploy). `wrangler.jsonc` is right; `vite.config.ts` is a leftover.
`public/_headers:1` likewise still says "Cloudflare Pages response headers"
against a Workers static-assets deploy. Harmless today, misleading to the next
person debugging a deep link.

### I7. Support and NWS contact point at an unprovisioned domain

`src/data/contact.ts:13` sets `SUPPORT_EMAIL = 'support@shorebound.app'`, and
`supabase/functions/refresh-conditions/index.ts:34` sends the same address as
the NWS `User-Agent` contact. `HANDOFF.md:18-20` records that `shorebound.app`
returns 525 and was never provisioned. Web 525 and MX are separate, so mail may
still work — but this needs confirming, twice over: `ROADMAP.md:60-67` makes a
working support contact a hard App Store requirement (Guideline 1.5), and NWS
asks for a reachable contact as the condition of using the API
(`refresh-conditions/README.md:19`). Losing the NWS feed takes live forecast off
all 25 spots.

### I8. The last-good conditions snapshot is evicted after 24 hours offline

Two caches, neither durable past a day. `src/lib/api.ts:54-55` is an in-memory
`Map` with a 60s TTL that does not survive a reload. Persistence is the service
worker's `shorebound-supabase` entry, with `maxAgeSeconds: 60*60*24`
(`vite.config.ts:174`). Past 24 hours offline the entry is purged and
`useConditions` resolves to `status: 'error'` with `data: null`
(`useConditions.ts:41-46`) — an error card rather than a labelled-stale
snapshot.

Arguably correct: a two-day-old tide prediction should not be presented. But
`README.md:38-39` states the contract as "a failed refresh keeps the last good
snapshot on screen and labels it stale", and past 24h it does not. Either widen
the window and lean on the existing `freshness` labelling, or state the 24-hour
horizon in the contract. Pick one; today the code and the contract disagree.

### I9. No Content-Security-Policy

`public/_headers:24-30` sets `X-Content-Type-Options`, `Referrer-Policy` and a
well-reasoned `Permissions-Policy`. There is no CSP. For an app that ships a
public anon key, loads Esri and OSM tiles, and renders remote advertiser-supplied
`logo_url` and `photos` (`listings.ts:49-51`) into `<img>` tags, a
`default-src`/`img-src`/`connect-src` policy is the structural control on what
a compromised or hostile third-party asset can do. Worth doing before the
directory carries paid creative from outside parties.

### I10. `public/offline.html` is orphaned and precached

Nothing in `src/` or the config references it; the only mention in the repo is
a marketing SEO brief. `globPatterns` includes `**/*.html`
(`vite.config.ts:112`) and it is not in `globIgnores`, so it ships into the
precache. The offline story is `navigateFallback: '/index.html'`
(`vite.config.ts:137`), which is the right one. Delete the file, or the next
person reads it as evidence of a fallback that does not exist.

### I11. The gate makes the SEO play structurally impossible

`entitlements.ts:135` and `ROADMAP.md:133-136` both identify
`tide chart bradenton` as the highest-intent keyword found in research, and
`ROADMAP.md` schedules prerendering as the first thing after v1. Every content
route including `/tides` is behind `Gated` (`App.tsx:67`), so a crawler gets a
redirect to `/signin`. Prerendering will not fix that on its own. Not a v1
problem and explicitly out of v1 scope — recorded here because it is the same
decision as C2, and if C2 is reopened it should be decided once with this in
view rather than twice.

### I12. Paid listing assets are remote-only

`EnhancedContent.logo_url` and `photos` (`listings.ts:49-51`) are absolute
remote URLs, so offline a paid shop degrades to something visually close to a
basic listing. That is honest degradation and probably correct. It should be
said out loud in the sales two-pager rather than discovered by the advertiser.

---

## Checked and found genuinely sound

These were examined against the constraints and hold. Recorded so the next
review does not re-litigate them.

**Constraint 4 — location never leaves the device. Clean.** `src/lib/geo.ts` has
no network call; `milesBetween` (`geo.ts:127-137`) and `rankNearby`
(`src/lib/nearby.ts:130-139`) are pure arithmetic over bundled `LOCATIONS`.
Every consumer of `coords` — `Home.tsx:241-268`, `Start.tsx:44-53`,
`Shops.tsx:24-33`, `NearYou.tsx:32-44` — is local computation. `_headers:30`
scopes `geolocation=(self)`. No path puts a coordinate in a request. The one
gap is that the guarantee rests on the binding comment at `geo.ts:14-20` with no
test behind it; a grep-based test asserting no fetch in the geo path would make
it structural rather than cultural.

**Constraint 5 — secrets. Clean in code.** `getSupabaseConfig()`
(`supabase.ts:36-41`) reads only `VITE_`-prefixed vars.
`SUPABASE_SERVICE_ROLE_KEY` appears only in `Deno.env` reads inside
`supabase/functions/` (`identify-fish/index.ts:360-364`), doubling as the
rate-limit pepper — a neat reuse that also makes rotation harmless
(`identify-fish/index.ts:250-256`). `ANTHROPIC_API_KEY` likewise
(`identify-fish/index.ts:296`). The only defect is C1: the CI grep that proves
it does not run on the production deploy.

**Constraints 2 and 3 — bundle-is-public, gate-is-a-UI-gate. Honestly held.**
Stated at every layer that could be tempted to forget it:
`entitlements.ts:1-27`, `auth.tsx:5-12`, `admin/Gate.tsx:5-18`. No access
guarantee anywhere depends on bundle secrecy. The real protection is RLS:
`fish_id_requests` has RLS on with no policies and grants revoked from anon and
authenticated (`fish_id_rate_limit.sql:27-31`), and `claim_fish_id_slot` is
revoked from `public, anon, authenticated` (`:110-111`). Admin is a row in
`public.admins` grantable only by the service role, and `Gate.tsx` says plainly
that it is hiding a screen, not securing one.

**The admin/reader boundary — the best-shaped thing in the repo.** Separate Vite
entry (`vite.config.ts:38-41`), excluded from precache
(`vite.config.ts:119-136`), excluded from the SPA navigate fallback
(`vite.config.ts:152`), and all of it asserted by
`src/test/admin.bundle.test.ts` — which checks the import graph, the router, the
precache config, the build inputs, *and* parses the denylist regexes to confirm
they match `/admin` while still letting `/`, `/locations`, `/fish/snook` fall
back offline (`admin.bundle.test.ts:104-134`). It also keeps owner-only
vocabulary out of the reader bundle (`:38-55`). This is the pattern the other
boundaries should copy.

**The live-conditions contract.** `src/lib/conditions.ts:1-25` fixes four
mandatory statuses so a blank card is unrepresentable; `useConditions.ts:45`
keeps the last good snapshot on an error instead of blanking;
`readConditions()` degrades a missing station, an unknown slug and malformed
jsonb to a valid empty snapshot rather than throwing (`supabase.ts:122-136`);
`network.ts:3-10` refuses to let `navigator.onLine` pre-empt a request. This
layer answers "what does it do with no connection" correctly and additively. It
is the model the shop directory (C4) should be rebuilt against.

**The identify-fish cost control.** Rate limit claimed before any spend, three
windows, counted and inserted in one transaction, a broken ledger failing closed
to 503 rather than open (`identify-fish/index.ts:386-397`), caller identified by
HMAC of IP with a server-side pepper so no raw address is stored, image never
written anywhere. The economics are documented and bounded. Only the
`entitlements.ts` description of it is wrong (C5), not the thing itself.

**`mergeMatrix` fails closed.** Unknown keys, malformed values and hostile
payloads collapse to the shipped default (`entitlements.ts:209-223`), with
`care.full` specifically protected by test (`entitlements.test.ts:43-45,74-75`).
The right posture, on the right side.

**Editorial/commercial separation.** `src/data/shops.ts:3-32` and
`src/lib/listings.ts:1-27` hold the line that payment buys prominence, never
presence, and never a competitor's removal; disclosure is structural in
`AdSlot` with no prop to suppress it; nothing is paid by default. The data model
keeps shop listings and open ad campaigns as separate products, which is what
the Apple IAP reasoning in `ROADMAP.md:101-117` depends on.

**Service worker precache correctness.** The `globIgnores` /
`inlineWorkboxRuntime` / `clientsClaim` reasoning in `vite.config.ts:103-164` is
each documented with the failure it prevents, and `appUpdate.ts` handles the
handover. This is hard-won and should not be touched casually — but C6 is inside
this same block and does need touching.

---

## Suggested order

1. **C3** — one line, restores a shipped feature. Then extend the CORS test to
   the origin list.
2. **C1** — until this lands, nothing below it is verified by anything.
3. **C5** — five minutes, removes a false statement about money.
4. **C2** — needs an owner decision first (options in C2). Blocks store launch.
5. **C4** — the revenue line. Depends on nothing; do it whenever C2 is being
   decided.
6. **C6** — needs browser verification after the change.
7. **I3** then **I1**, because I3 is what would have caught C2.

Everything in IMPROVABLE can wait for v1.1 except I7, which is a phone call and
a DNS check and gates an App Store requirement.

## Needs a human call

- **C2** — whether the account gate opens for a first-run offline reader. This
  is a product decision about the sign-up funnel, not an engineering one.
- **I7** — whether `support@shorebound.app` receives mail today. Affects the
  App Store submission and the NWS feed.
- **I2** — whether to ship the free/paid matrix screen in the console at all in
  v1, given nothing it sets takes effect.
