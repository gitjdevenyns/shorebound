# QA review — Shorebound application code

Reviewed 24–25 Aug 2026. Read-only. Full suite and build re-run independently.

> Recorded after the fact from the reviewer's report, so the timeline and the
> other five audits have a complete set. Findings marked **FIXED** were closed in
> the same session.

## Verification performed

| Command | Result |
|---|---|
| `npm test` | PASS — 16 files, 316/316, exit 0 |
| `npm run build` (`tsc --noEmit && vite build`) | PASS — no warnings, 24 precache entries |
| `curl https://shorebound.fish/`, `/admin`, `/locations/emerson-point` | 200, 200 (serves `admin.html`), 200 |
| `grep` for service-role key in `dist/` | not present; `.env.local` untracked |
| Content counts vs `CLAUDE.md` | 25 spots ✅, 11 species ✅, 104 recipes ✅, 20 shops ✅ |

The "green or revert" gate holds. Everything below is what the green does not cover.

---

## CRITICAL

### C1. The app generated per-species spot advice and rendered it as an instruction. FIXED.

`src/components/location/zones.ts:274-297` — `SPECIES_PREFERENCE` was a
hand-written table of species→structure orderings with no provenance header, no
citation and no data backing. `zoneForTarget` used it to pick which numbered
casting zone each species was "most likely to be working" at each spot, and fell
back to `return zones[0]` — the first structure string in the array — when the
species was not in the table.

That output rendered as an unhedged imperative at
`src/components/TargetRecipe.tsx:77-84`, wired in at
`src/pages/LocationDetail.tsx:469`.

All 104 recipes were enumerated. **7 hit the `zones[0]` fallback:**

```
pass-a-grille-jetty     Ladyfish  -> zone 1 "Point tip"      (structures: jetty point | pass | surf trough | sandbar cuts)
fort-de-soto-gulf-pier  Kingfish  -> zone 1 "Bridge pilings" (structures: pier pilings | deep channel | surf trough)
stump-pass              Ladyfish  -> zone 1 "Pass"
green-bridge            Ladyfish  -> zone 1 "Bridge pilings"
bridge-street-pier      Ladyfish  -> zone 1 "Bridge pilings"
st-pete-pier            Ladyfish  -> zone 1 "Bridge pilings"
new-pass-ken-thompson   Ladyfish  -> zone 1 "Pass"
```

So `/locations/pass-a-grille-jetty` told the reader, under Ladyfish: *"**Point
tip.** Cast up-current of the tip so the bait swings naturally into the seam
behind it."* The only reason it said "point tip" is that `"jetty point"` was index
0 of that spot's `structures` array. The other 97 were inferred from the uncited
table.

This contradicted the file's own header at `TargetRecipe.tsx:15-17`: *"Every value
is real… Fields the data does not have are left out rather than filled with a
plausible-looking guess."* Contrast `src/lib/nearby.ts:164-170`, which quotes
researched season strings verbatim precisely to avoid writing new fishing content,
and is guarded by `src/test/nearby.test.ts:97-105`. No equivalent guard existed
for zones.

> **FIXED** — `SPECIES_PREFERENCE` and the `zones[0]` fallback are gone.
> `zoneForTarget` now resolves only from `recipe.cast_zone`, the field the schema
> already reserved (`src/data/types.ts:136`). No recipe populates it yet, so no
> cast line renders; `TargetRecipe` already guarded on null. `src/test/zones.test.ts`
> fails if a zone is ever returned for a recipe with no researched `cast_zone`.

### C2. Offline-first broken on every species, hazard and habitat page. OPEN.

`vite.config.ts:112` precaches `**/*.{js,css,html,svg,png,woff2,webmanifest}` —
**no `jpg`/`jpeg`/`webp`** — and the runtime rules match only Supabase and
same-origin `/assets/`. Nothing matches a third-party image origin.

Every `MediaRef` in the data was classified:

```
FISH images:     21 REMOTE,  1 local
HAZARD images:    6 REMOTE,  0 local
HABITAT photos:   8 REMOTE,  0 local
```

10 of 11 species pages lead with a hotlink to `floridamuseum.ufl.edu` or
`upload.wikimedia.org`. The one local file is **also** missing from the built
manifest — `dist/assets/species/gray-snapper-fda-rfe.jpg` does not appear in
`dist/sw.js`, because jpg is excluded by the glob.

*Concrete failure.* Install the PWA, go to a jetty with no signal, open
`/fish/snook`. The ID plate — the feature with a dedicated 248-line geometry suite
proving pin placement to sub-pixel accuracy — renders a broken-image icon. Same
for all six Handle With Care cards and all eight Read the Water photos.
`src/test/content.test.ts:55-61` explicitly *permits* remote https hotlinks, so no
test catches it. `README.md:158` claims species pages render offline — the shell
does; the photographs do not.

---

## IMPORTANT

### I1. Generated safety guidance visually indistinguishable from researched safety. FIXED.

`src/components/location/Cautions.tsx:113-133` — the honest disclaimer rendered
**only when `loc.safety` was empty**. 21 of 25 spots have researched safety, so on
those 21 the generated cautions were appended immediately after the cited ones
using the identical `<Callout tone="warn">`, unlabelled. The generated ones carry
bold titles, making them look *more* authoritative.

Two further defects in the same file:

- **`WADE_CAUTION` fired without wade access** (`Cautions.tsx:103-109`), triggering
  on any grass/flat/pothole zone regardless of `loc.access`. 7 spots fired it with
  no wade access, including `fort-de-soto-bay-pier` (access `[pier]` only), telling
  a pier angler *"Shuffle, don't step — Rays lie buried on sand in the trough."*
- **`STORM_CAUTION` was an unsourced season claim on all 25 spots**
  (`Cautions.tsx:84-89,111`): *"From roughly June to September…"*. Seasons are
  named explicitly in the CLAUDE.md prohibition, and it rendered on bridge spots
  that are neither flat, beach nor pier.

> **FIXED** — researched safety is now labelled "Checked for this spot:" and the
> generic block always carries its own disclaimer, on all 25 spots rather than the
> 4 with no researched safety. The month range is removed. Wade advice requires
> wade or shore access plus wadeable structure, so pier-, bridge- and boat-only
> spots no longer get it. Storm advice fires only where its body is true.

### I2. The entire live-conditions parsing layer has zero tests. OPEN.

`src/lib/conditions.ts` is 533 lines — CO-OPS timezone resolution across DST
(`stationTimeToMs:323`), raised-cosine height interpolation (`derivePhase:416`),
slack-window stage naming, NWS period selection (`parseNwsForecast:490`),
`describeTidePosition:168`. **No test file imports it.**

Compounding it: because `.env.local` supplies a Supabase config, `useConditions`
starts in `'loading'` and the promise never settles inside a synchronous test, so
`routes.test.tsx` renders every location page with `LiveTide` stuck in the skeleton
branch. The `'ready'`, `'error'` and `'unavailable'` paths of `LiveTide` (348 lines)
and `NowCard` are never executed.

This is the single largest gap between "316 tests passing" and "the live tide
feature works". A DST-boundary regression in `stationTimeToMs`, or an off-by-one in
`derivePhase`'s slack window, ships green.

### I3. An empty-but-valid snapshot renders a card of dashes claiming to be predictions. OPEN.

`src/lib/supabase.ts:160` — `if (!locationRow) return empty();` resolves
successfully with `refreshed_at: null, tides: [], phase: null, weather: null`.
`useConditions` sets `status: 'ready'`, and `LiveTide.tsx:248` renders the full
card: "Tide stage unknown", Wind/Air/Sky/Range all `—`, and a `FreshnessNote`
reading **"Predicted values, cached unknown."**

*Concrete failure.* Rename a slug in `locations.ts` without the matching DB
migration, or add a spot before the row exists. The page asserts it is showing
NOAA predictions while showing nothing. This is exactly the failure
`conditions.ts:525-531` guards against for weather but not for the snapshot as a
whole. The `'unavailable'` branch has correct honest copy and is never reached.
`scripts/check-db-sync.mjs` exists to catch the drift but is not run in CI.

### I4. 12 of 13 entitlements unenforced, and the owner console says otherwise. OPEN.

The only enforcement point is `src/components/AdSlot.tsx:31`. `capList` and
`limitOf` have **zero call sites** in `src/pages/` or `src/components/`.

*Concrete failure.* In `/admin`, set `locations.count` free = 3 and click "Save
packaging". The console reports "Saved. Readers pick it up on their next load."
Nothing changes; free readers still see all 25.

This also makes most of `src/test/entitlements.test.ts` a test of dead code —
`it('caps a list only when a cap exists')` exercises a function nothing calls, and
`it('keeps Handle With Care free')` asserts a flag no code reads. These would pass
unchanged if the feature were deleted.

### I5. README "Verified state" contains three claims the repo contradicts. OPEN.

`README.md:150-161` — *"`npm test` 243 passing"* (actual 316 at review time);
*"21 precache entries"* (build says 24); and *"axe-core: no WCAG 2.1 A/AA
violations across every route"* — **there is no axe-core dependency in
`package.json` and no axe assertion anywhere in `src/test/`.** The only occurrence
of "axe" is a comment at `routes.test.tsx:85` referring to a check that file does
not contain. The a11y tests are hand-rolled landmark/alt-text checks — useful, but
not an axe audit.

### I6. The content-rule test scans only `src/data`, not where the prose lives. OPEN.

`src/test/content.test.ts:121-145` builds its corpus from `FISH`, `HAZARDS`,
`HABITATS`, `LOCATIONS`, `TIDE_GUIDE` and scans for regulation claims. It does not
scan the substantial fishing prose in components: `location/zones.ts:61-206`,
`location/Cautions.tsx:25-89`, `conditions/LiveTide.tsx:26-31`,
`pages/Tides.tsx:88-142` (`STAGES`, no provenance header),
`species/speciesContent.ts`, `care/hazardContent.ts`. A line like "it is illegal to
keep" added to any of these ships green. Extending the corpus is a one-line change.

### I7. No CI on the actual deploy path. OPEN.

The only workflow targets GitHub Pages, and its own header states hosting moved.
Deployment is `npm run deploy` → `wrangler deploy`, run by hand. Nothing forces
`npm test` or `npm run build` before a live deploy, so "green or revert" is
convention, not a gate.

---

## MINOR

- `src/lib/api.ts:1-8` — header says conditions "will come from Supabase later…
  currently always resolves to null". The function is implemented and live.
- `src/test/shops.data.test.ts:11` — test named `'has unique slugs and real
  regions'` asserts only slug uniqueness. A name promising a check that isn't there
  is worse than no test.
- `src/test/admin.bundle.test.ts:75-86,104-124` — asserts on the *source text* of
  `vite.config.ts`; passes if the string appears in a comment. The import-graph
  checks at 41-68 are sound; the config-string ones are not.
- `README.md:145-147` — references `dist/404.html` and GitHub Pages base paths;
  `vite.config.ts:30` is `base: '/'`.
- `CLAUDE.md:24` — "159 cited sources" not reproducible: 165 unique URLs in
  `src/data/`, 142 unique in `docs/research/`, 270 in the union.
- `src/lib/nearby.ts:134` — `daypartAt(now.getHours())` uses the *device's* local
  hour, so a reader on a non-Eastern timezone gets "it is dusk now" at the wrong
  time. Bounded, given the audience is physically on the Gulf coast.

---

## Explicitly NOT verified in this environment

- **Supabase-side anything.** Whether `tide_latest`/`weather_latest` hold rows for
  all 25 slugs — i.e. whether "live NOAA tide and NWS forecast on all 25 spots" is
  true in production. The client path exists and is correct; the data is
  unconfirmed, and `readConditions` failing to find a row is silent (see I3).
- **RLS.** Routed to `security-privacy-reviewer`, which did verify it empirically.
- **Edge Function runtime behaviour.** `identifyFish()`'s HTTP branching
  (`src/lib/identify.ts:186-294`) is fully mocked out by `identify.test.tsx:31-34`,
  so the 429/413/400/timeout/abort paths have no test at any level. The UI suite
  proves the *page* handles every outcome; it proves nothing about which outcome
  the client produces from a given HTTP response.
- **The "photo is not stored anywhere" promise** is asserted as UI copy; whether
  the Edge Function honours it is server-side.
- **Visual/browser verification.** The Playwright sysroot was not used. C2 and I1
  are both the class of bug CLAUDE.md says is invisible in source and obvious in a
  screenshot.

---

## Verdict at time of review

**Blocked** — on C1 and C2. C1 is now fixed; **C2 remains open.**

The suite is well above average where it exists — `nearby.test.ts:97-105`,
`identify.data.test.ts:83-152`, `media.test.tsx`, `content.test.ts` and
`functions.cors.test.ts` are genuine invariant tests, several with guard-tests
against their own silent passage. The problem is not test quality; it is that the
tests cluster on the static bundle and leave the dynamic and inferred surfaces
uncovered — which is exactly where both criticals lived.
