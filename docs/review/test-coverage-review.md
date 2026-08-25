# Test coverage review — Shorebound

Scope: read-only audit. No test or source files were changed for this review.
`npm test` was run as-is; nothing was added, skipped, or modified.

## Suite health right now

- `npm test` → **316 passed / 316, 16 test files, 0 failed.** Confirmed by
  running it directly (`vitest run`, 59.8s wall).
- `.only(` / `.skip(` / `xit(` / `xdescribe(`: **none found** anywhere in
  `src/test/`.
- No `threshold` (coverage gate) anywhere in `vite.config.ts` — there is in
  fact **no `test.coverage` block at all**, so nothing computes or enforces a
  coverage percentage. This isn't a lowered threshold (which CLAUDE.md
  forbids); it's the absence of one, which means a large uncovered module
  (see below) produces no signal in CI at all. Worth deciding on deliberately
  even if the answer stays "no gate" — right now it's not a decision, it's a
  gap.
- CLAUDE.md's "green or revert" bar is currently met. The gaps below are about
  what green *doesn't* prove, not about the suite being broken.

## Map of the surface

`src/` has 91 non-test source files across `pages/`, `components/`, `lib/`,
`data/`, `admin/`. 16 test files exist, all under `src/test/`, all using
Vitest + Testing Library, colocated by feature rather than 1:1 with source
files (e.g. `identify.data.test.ts` covers `lib/identify.ts` + `lib/image.ts`
+ the identify-fish Edge Function's species list). `supabase/functions/` has
4 Edge Functions (`admin-users`, `delete-account`, `identify-fish`,
`refresh-conditions`); these run under Deno and are exercised by exactly one
test (`functions.cors.test.ts`), which does static regex checks against their
source text for CORS header completeness — it asserts nothing about their
actual runtime behavior.

Well-covered, for reference (not gaps): `src/data/*` (data.test.ts,
content.test.ts, shops.data.test.ts, review.data.test.ts, identify.data.test.ts
cross-check data integrity, source provenance, regulation-claim honesty, and
guide/Edge-Function species-list sync exhaustively); `lib/entitlements.ts`
(entitlements.test.ts covers the capability registry, `mergeMatrix` hostile
input, `care.full` can't be closed); `lib/listings.ts` (fail-safe-to-free
parsing, disclosure); `lib/identify.ts` parsing (`parseFishIdResult`) and the
`/id` page's ten UI states; the admin/reader bundle-separation invariants
(`admin.bundle.test.ts`); the auth gate's redirect/resume/open-redirect
behavior (`auth.test.tsx`); route-level console-cleanliness
(`routes.test.tsx`).

## Gaps, ranked by cost of a silent regression

### CRITICAL

**1. `src/lib/conditions.ts` (532 lines, 100% pure functions) has zero
tests.** No `conditions.test.ts` exists, and no other test file imports
`derivePhase`, `parseNwsForecast`, `parseTidePredictions`,
`stationTimeToMs`, `describeTidePosition`, `freshnessOf`, or `compactSky`.
This is the single module that turns whatever NOAA CO-OPS and NWS actually
send into what the app shows on all 25 spots' live-tide cards — the feature
the "Current state" section of CLAUDE.md leads with. Every failure path the
task asked me to check (malformed payload, missing station, DST boundary,
mixed H/H tide stations, an unparseable timestamp, an NWS period with no
usable field) is handled by explicit `if`-branches in this file and none of
them is asserted anywhere. A regression here — e.g. `stationTimeToMs` getting
the DST offset wrong, or `derivePhase`'s slack-window math flipping which
side counts as "high" — would silently show the wrong tide stage to someone
standing on a jetty, and nothing in CI would catch it.
  - Tests that should exist: `parseTidePredictions`/`derivePhase` against a
    real-shaped CO-OPS `interval=hilo` JSON (documented in
    `supabase/functions/refresh-conditions/README.md`) plus malformed
    variants — missing `predictions`, non-array, entries missing `t`/`v`,
    bad `type`, a naive local timestamp straddling a DST transition (the
    exact case the two-pass offset lookup exists for), two same-type events
    back to back (mixed-tide station case called out in the doc comment).
    `parseNwsForecast` against a real gridpoint-forecast shape and its
    failure modes — no `properties`, no `periods`, all periods yielding
    nothing usable (must return `null`, not a card of dashes), Celsius
    temperature conversion, wind text with a range vs. a single number.
    `freshnessOf`/`STALE_AFTER_MS` boundary. `describeTidePosition` at the
    slack-window boundary vs. mid-swing.

**2. `src/lib/useConditions.ts` and `src/components/conditions/LiveTide.tsx`
have zero tests of their state machine.** `useConditions` is the seam that
turns a promise into one of `loading | ready | error | unavailable`, and
`ConditionsResult.freshness` additionally distinguishes `offline` from
`error`-while-online. `LiveTide.tsx`'s own doc comment says "renders in all
four `useConditions` states and never blanks." No test renders it in the
`error` or `unavailable` state, or asserts the `offline` freshness label
appears when `navigator.onLine` is `false`. `routes.test.tsx` incidentally
exercises this path (Supabase is configured in the test env via
`.env.local`, so `LocationDetail` really calls `useConditions`, which almost
certainly settles to `error` under the sandboxed test network), but only
checks for a clean console — it makes no assertion about what actually
rendered, so a broken error state (blank card, wrong copy, a real crash that
happens not to `console.error`) would pass silently.
  - Tests that should exist: mock `fetchConditions`/`readConditions` to
    reject → `LiveTide` renders `ErrorState`, not a blank card, and keeps
    previously-good data on screen per the "Keep any previously good data"
    comment in `useConditions.ts`. Mock a slow/never-resolving promise →
    `Skeleton` renders, not a stuck spinner forever. Mock
    `isSupabaseConfigured()` false → `unavailable`, and the location's own
    researched tide playbook still renders (offline-first contract). Toggle
    `navigator.onLine` → `freshness` reports `'offline'` instead of
    `'error'`. `refetch()` actually re-fetches (currently `clearConditionsCache`
    + `fetchConditions`'s in-flight dedup in `lib/api.ts` is also untested —
    the TTL-sharing and eviction-on-failure logic in `fetchConditions` has no
    direct test either).

**3. No test enforces "no coordinate ever enters a network call."** This is
a hard constraint in CLAUDE.md with a binding comment in `src/lib/geo.ts`,
and the codebase already has the right *pattern* for this kind of
invariant — `functions.cors.test.ts` and `admin.bundle.test.ts` both do
static source-grep checks for exactly this class of rule ("owner vocabulary
never named in the reader bundle," "admin never imported by the app entry").
No equivalent exists for coordinates. Today it happens to be true because
`geo.ts`/`nearby.ts` are pure arithmetic and the only `fetch()` in `src/lib`
is `identify.ts`'s image upload — but that's true by inspection, not by a
test that would fail if it stopped being true.
  - Test that should exist, matching the existing static-check style: walk
    `src/`, and for every file that imports `useGeolocation`/`Coords` from
    `lib/geo`, assert `coords` (or its `.lat`/`.lng`) is never passed as an
    argument to `fetch`, `supabase.from(...)`, or a Supabase RPC call in the
    same file — or, more simply, assert that `lib/geo.ts` and `lib/nearby.ts`
    contain no `fetch(` and import nothing from `lib/supabase.ts`. Either
    form would fail loudly the day someone wires up, say, "near you" as a
    server-ranked feature instead of on-device arithmetic.

**4. No test asserts the built `dist/` is free of the service-role key (or
any other server secret).** CLAUDE.md: "Secrets never enter the bundle... the
service role key belongs in Edge Functions and nowhere else." Nothing in
`src/test/` reads from `dist/` at all — confirmed by grep. `vite.config.ts`'s
two-entry split (`index.html` / `admin.html`) and the admin-bundle-separation
test protect against the *admin console* leaking into the reader bundle, but
that's a different property from "no secret string is present in either
bundle." A build-time regression (e.g., a `.env` value renamed to start with
`VITE_` by accident, or a stray `console.log(serviceKey)` copy-pasted into
client code during a refactor) would ship to production undetected.
  - Test that should exist (necessarily a separate script or a
    build-then-grep test, since `npm test` alone doesn't build): after
    `vite build`, grep every file in `dist/` for the literal service-role key
    value used in CI/deploy (or, since the real key obviously can't be a test
    fixture, grep for the *shape* — `eyJ...` JWT segments with `"role":"service_role"`
    decoded, or simpler, grep for the env var name pattern
    `SUPABASE_SERVICE_ROLE_KEY` and any string containing `service_role`).
    This has to run post-build, so it's naturally a separate `npm run
    build && node scripts/check-no-secrets.mjs`-style check rather than a
    vitest case — but nothing today plays that role, npm-test or otherwise.

### IMPORTANT

**5. `src/admin/useReview.ts` — the review-queue workflow — has zero tests.**
This is exactly the "state-machine / workflow logic" the brief calls out:
five statuses (`pending → accepted | rewritten | skipped | needs_info`), an
optimistic-update `decide()` that writes to local state before the network
call resolves and does *not* roll back on a failed write (it sets an error
banner and leaves the optimistic state in place — worth confirming that's
intentional, since it means a failed save can look saved), and a sort/rank
function (`urgent && pending` first, then `pending`, then decided) that
directly drives what the owner sees at the top of a backlog. None of this is
exercised. `review.data.test.ts` only checks the *bundled JSON* is
well-formed — it never touches `useReview.ts`'s logic.
  - Tests that should exist: `decide()` merges a partial patch onto existing
    decision state correctly and stamps `decided_at`; a failed Supabase
    upsert sets `error` without discarding the optimistic value (or, if that
    is a bug, this is where it'd be caught); `counts` tallies each status
    correctly including `urgent` (only counts urgent+pending, not
    urgent+accepted — easy to get backwards); `rows` sorting puts
    urgent-pending before plain-pending before anything decided, with a
    stable tiebreak on `target`.

**6. `src/lib/identifyFish()`'s actual network path (in `lib/identify.ts`,
not the UI) is untested.** `identify.test.tsx` mocks `identifyFish` entirely,
and `identify.data.test.ts` only tests the pure `parseFishIdResult`. The
status-code-to-outcome mapping (429→rate-limited with `retry_after_seconds`,
413→too-large, 400→bad-image, non-ok→server, 200-with-`error:"declined"`→
declined, AbortError→timeout, `navigator.onLine===false`→offline vs. generic
transport failure→server) is real branching logic with six distinct
failure kinds and no test drives a mocked `fetch` through any of them. A
regression that, say, swapped the 413/429 branches, or stopped checking
`navigator.onLine` before defaulting to `'server'`, would only be caught by
the (mocked-away) UI test, i.e. not caught at all.
  - Tests that should exist: `vi.stubGlobal('fetch', ...)` returning each
    status code and body shape above, asserting the exact `IdentifyOutcome`;
    a `fetch` that rejects with `AbortError` → `timeout`; a `fetch` that
    rejects with a generic error while `navigator.onLine` is `false` →
    `offline`; the same rejection while online → `server`; a 200 response
    whose body fails `.json()` → falls through to the `!res.ok` — actually
    check current behavior, since `res.ok` would be true here and the code
    would then try `parseFishIdResult(body.result)` on `body = {}`, hitting
    the "came back in a shape this app could not read" branch — worth an
    explicit test since it's a subtle path.

**7. `src/lib/appUpdate.ts` (`installUpdateRecovery`) has zero tests**, and
its own doc comment records that this exact logic broke in production twice
(stale shell served indefinitely; then a stale chunk 404 after the fix
landed) before arriving at the current cooldown-gated reload design. That
history is itself the argument for a regression test: this is precisely the
kind of module where "worked when I looked at it" isn't good enough, and
where the failure mode (silently never picking up new deploys, or a refresh
loop) is invisible until a user reports it.
  - Tests that should exist, using `vi.useFakeTimers()` and mocked
    `sessionStorage`/`ServiceWorkerContainer`: first `controllerchange` after
    a fresh, uncontrolled page arms the flag without reloading; a second
    `controllerchange` reloads exactly once; a `vite:preloadError` reloads;
    two triggers inside `RELOAD_COOLDOWN_MS` (15s) only reload once; a
    reload that's blocked because `sessionStorage` is unavailable (private
    mode) still allows one reload rather than throwing.

**8. `src/admin/Gate.tsx` — the owner console's client-side door — has no
component test.** The five branches (`checking`, `disabled`, `out` with a
sign-in form, signed-in-but-not-admin, signed-in-and-admin renders children)
are all real UI states with real copy, and the "not an owner account" branch
is the only thing telling a signed-in non-admin why the screen they're
looking at doesn't work — get that branch wrong (e.g., render `children`
before `isAdmin` resolves) and the console UI would flash open for anyone
signed in, even though every write would still be rejected by RLS. That
caveat is exactly why this is IMPORTANT rather than CRITICAL: the real lock
is server-side (migration 20260822140000, per the file's own comment) and is
outside what a Vitest suite in this repo can verify — but the UI door not
opening for the wrong person is still worth asserting, the same way
`auth.test.tsx` asserts it for the reader app's `RequireAuth`.
  - Test that should exist, mirroring `auth.test.tsx`'s pattern: render
    `Gate` with a mocked `useAuth()` returning each of the five states,
    assert the right heading/branch renders and that `children` is rendered
    in exactly one of them.

### NICE

**9. `src/lib/network.ts` (`useOnline`) has no direct test.** Small (24
lines) and implicitly exercised wherever `navigator.onLine` matters, but a
direct test (initial state reflects `navigator.onLine`, `online`/`offline`
window events flip it, listeners are cleaned up on unmount) would be cheap
and would catch a stale-closure bug if the hook is ever refactored.

**10. Service-worker/offline behavior is checked only at the config-text
level, never at the built-artifact level.** `admin.bundle.test.ts` correctly
asserts the *source* of `vite.config.ts` names `admin.html` in
`globIgnores` and the denylist regex behaves correctly against sample paths —
that's a real and valuable test, and it already caught a real production bug
per its own comment. But nothing in the suite runs an actual `vite build`
and inspects the generated `dist/sw.js`'s precache manifest, so a Workbox
version bump or an unrelated config change that silently breaks the
`globPatterns`/`globIgnores` interaction (the exact
`add-to-cache-list-conflicting-entries` failure mode the comments describe
happening before) would not be caught by this suite — only by a manual
`npm run build` + `npm run preview` + DevTools check, which is exactly the
kind of thing CLAUDE.md's "a browser is available" note exists for. This is
NICE rather than IMPORTANT because the config-text tests already cover the
specific historical failure mode precisely, and a full precache-manifest
assertion would be a bigger, more brittle test to maintain for marginal
extra protection.

**11. `src/admin/{Ads,Shops,Users,Console}.tsx` have no component tests at
all** (only `Gate.tsx`, discussed above, and the bundled JSON they read).
These are the owner's actual working screens for shop listings, ad
campaigns, and account admin. Given the primary risk (unauthorized writes)
is already owned by RLS and is out of this repo's reach, and these are
single-operator internal tools rather than reader-facing surfaces, I'm
ranking this NICE — but if `backend-engineer` adds new write paths to any of
these screens, contract/behavior tests for the write flow (not just the data
shape) would move this up.

## What I did not verify

- Nothing here was run against a live Supabase project, a live NOAA/NWS
  endpoint, or the deployed Edge Functions — all of the gaps above describe
  tests that would need to run against **documented, mocked** shapes (the
  CO-OPS/NWS JSON is documented in `supabase/functions/refresh-conditions/README.md`;
  I did not re-verify that README against a live API pull in this session).
- I did not attempt to write or run any of the tests described above; per
  the brief for this round, this is a coverage map, not new coverage.
- The Edge Functions themselves (Deno runtime) are outside what this repo's
  Vitest setup can execute directly; any real test of their logic (rate-limit
  claim ordering, admin-check-before-service-role-use in `admin-users`,
  `delete-account`'s self-only scoping) would need either a Deno test runner
  or a live/staging Supabase project — I did not attempt either.
