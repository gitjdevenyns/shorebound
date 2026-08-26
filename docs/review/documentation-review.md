# Documentation review — accuracy audit

Reviewed 24 Aug 2026 against the code as it stands in this working tree. Scope:
`CLAUDE.md`, `README.md`, everything under `docs/` and `marketing/`. Every
factual claim below was checked against `src/data/`, `src/pages/`,
`src/admin/`, `supabase/`, `wrangler.jsonc`, `.github/workflows/`, and
`package.json` — not restated from a prior doc.

**Tooling note:** this session had no shell/Bash tool, only `Read`/`Grep`/
`Glob`/`Write`/`Edit`. `npm test` could not be executed, so the three
conflicting test-count claims (below) are triangulated from static analysis
of the suite files rather than a live run. Whoever rewrites these docs should
run `npm test` once and paste the real number everywhere it appears.

---

## DRIFTED — fix these

### 1. README.md's entire "where it lives" story is stale (Cloudflare vs. GitHub Pages)

`README.md` is the single most out-of-date document in the set. It was not
updated when hosting moved.

| README.md says | Actual state | Evidence |
|---|---|---|
| `Live site: https://gitjdevenyns.github.io/GCF/` (line 8) | Live at `https://shorebound.fish` on Cloudflare Workers | `CLAUDE.md` line 6; `wrangler.jsonc` (`"name": "shorebound"`, static-assets deploy); `package.json` `"deploy": "wrangler deploy"` |
| React Router "base path `/GCF/`" (line 12) | `wrangler.jsonc`'s own comment says the app "now builds with base `/` for its own domain" | `.github/workflows/deploy.yml` lines 1–5 (a comment added to the *old* workflow explicitly says this) |
| "Deploy model" section (lines 139–148): pushes to `main` build and deploy via `actions/deploy-pages` to GitHub Pages | That workflow is a **kept fallback**, not what actually runs. The live site deploys via `wrangler deploy` to Cloudflare Workers. | `.github/workflows/deploy.yml` lines 1–5: *"Hosting moved to Cloudflare Pages. Kept as a fallback: it works again the moment a custom domain is attached to GitHub Pages"* |
| `dist/404.html` deep-link workaround described as the mechanism (line 145) | Cloudflare's `not_found_handling: "single-page-application"` is the actual mechanism now; the 404.html trick is GitHub-Pages-only and no longer primary | `wrangler.jsonc` lines 21–30 |

README's title ("Gulf Coast Fishing Guide (GCF)") and package name have also
diverged — `package.json` renamed the project to `"shorebound"` and the
description now reads "Shorebound... 25 researched spots" — but README's
header, stack section and deploy section were never touched in the rename.
By contrast, README's **Photo ID** and **Content rules** sections *are*
current and internally consistent with the code (verified below) — this is a
patchwork document, not uniformly stale. A rewrite should keep those sections
and replace everything from "Live site" through "Deploy model."

**Recommendation:** rewrite README's opening stack/deploy description to match
`CLAUDE.md` (Cloudflare Workers, `shorebound.fish`, base `/`), or fold README
into CLAUDE.md's "where things are" table and demote README to
implementation detail only.

### 2. `docs/ROADMAP.md`'s "Deployed" row is the same stale claim

Line 35: `| Deployed | https://gitjdevenyns.github.io/GCF/ |` — same drift as
above, and doubly confusing because the very same document's "Naming" item
(item 1) is written as though the domain and hosting question is still open,
while `docs/HANDOFF.md` (one level up in the doc hierarchy, dated the same
day) says the domain and Cloudflare hosting have been live and working for
some time. Fix the row to `https://shorebound.fish` and reconcile with item 1
below.

### 3. `docs/ROADMAP.md` item 1 recommends a name `docs/NAMING.md` calls dead

Item 1 ("Name, domain, email," lines 46–58) says:

> **Recommendation: Read the Water** (`readthewater.app` free; the `.com` is
> a parked lander worth a broker quote).

But `docs/NAMING.md` (lines 71, 81–82), the document ROADMAP itself points
to as "Naming decision and evidence," says the opposite:

> | **Read the Water** | *The Water Magician* — a manga/light novel dominates
> every completion | ☠️ dead |
>
> **Read the Water was recommended twice before this test was run. It is the
> best-sounding name on the list and it is unusable.**

And `docs/HANDOFF.md` line 69 records the actual decision: **"Name stays
Shorebound."** `CLAUDE.md`'s own project title is "Shorebound." So ROADMAP
item 1 is not just stale, it recommends the literal name that a sibling doc
(which it cites as authoritative) rejected outright, and the decision has
since been made and shipped (the app is live at shorebound.fish, package name
is `shorebound`, `docs/NAMING.md` is dated 22 Aug, `docs/HANDOFF.md`'s
decision is dated 24 Aug — three days after ROADMAP's own "verified 22 Aug
2026" stamp, so ROADMAP simply never got the update pass). Given
`CLAUDE.md`'s framing — ROADMAP "exists to say no" — a live self-contradiction
inside it undermines exactly the authority the document depends on.

**Recommendation:** delete or rewrite item 1 entirely. Naming, domain (mostly)
and hosting are done; what's left of that item is only the email
deliverability follow-through, which HANDOFF.md item 1 already tracks as a
live blocker.

### 4. `docs/ROADMAP.md` item 2 is fully stale — the pages it says don't exist, exist

Item 2 ("Privacy policy and support pages," lines 60–67) states:

> **A hard App Store requirement, and neither exists.**
> ...
> This app has an unusually good story to tell here and currently tells it
> nowhere: location never leaves the device, photos are never stored, **no
> accounts**, no third-party ad network, no tracking.

Both are wrong as of the current tree:

- `src/pages/Privacy.tsx` and `src/pages/Support.tsx` both exist, are routed,
  and are substantive (Privacy.tsx runs 183 lines covering accounts, location,
  photo handling, rate-limit hashing, third-party processors, children,
  deletion — the exact content this roadmap item says is missing).
- **Privacy.tsx itself now documents accounts** — it opens with *"It does have
  accounts now — that is the one thing about you it keeps"* — directly
  contradicting the roadmap's "no accounts" framing that CLAUDE.md's own
  "Current state" section also contradicts (*"accounts with a sign-up gate, a
  user settings page"*).

This confirms the specific contradiction flagged in the brief: **ROADMAP says
"no accounts" while accounts are built and deployed.** It's not an isolated
line — the whole item is describing a pre-accounts, pre-privacy-page version
of the app that no longer exists.

**Additional finding, not in original scope but adjacent:** `Privacy.tsx`
itself (line 127) says *"Hosting is GitHub Pages, which serves the app
itself."* That is the same Cloudflare/GitHub Pages drift as README and
ROADMAP, except this instance is **live, user-facing, and cited as an App
Store Guideline 5.1.1(i) compliance artifact** — a materially wrong claim in
a privacy policy is a different order of problem than a wrong claim in an
internal doc. Flagging for whoever owns `src/pages/Privacy.tsx` next, since
it's outside this review's file set but too load-bearing to sit on.

### 5. `docs/OPS_BACKLOG.md` item 4 describes finished research as outstanding

Item 4 ("Research `seasons` and `dayparts`," lines 46–51) says:

> `seasons` exists for 10 of 25 spots, `dayparts` for 13 of 25.

Actual counts in `src/data/locations.ts`, checked directly:

| Field | OPS_BACKLOG claim | Actual | Method |
|---|---|---|---|
| `seasons` populated | 10/25 | **24/25** | 24 non-empty `seasons: [...]` blocks; matches `docs/ROADMAP.md`'s own "seasons 24/25" line exactly |
| `dayparts` populated | 13/25 | **22/25** | 22 `dayparts: [...]` entries counted directly |

`docs/ROADMAP.md`'s "Content coverage" line (seasons 24/25 · access 25/25 ·
safety 21/25 · sources 25/25) was independently re-verified field by field and
is **accurate** — every one of those four numbers matches a direct count of
the data. So this isn't an isolated OPS_BACKLOG typo: it's an entire backlog
item describing work that ROADMAP (same day, 22 Aug) already recorded as
essentially done. Either the research landed after OPS_BACKLOG was written
and the backlog wasn't updated, or OPS_BACKLOG predates a batch of location
research and was never reconciled against it.

**Recommendation:** re-verify item 4 against current data and, if the
seasons/dayparts gap really is down to 1/25 and 3/25 respectively, close or
sharply rewrite the item — it is currently the single largest overstatement
of remaining work in the whole doc set.

### 6. `docs/OPS_BACKLOG.md` item 5 says the shop directory "ships empty by design" — it has 20 shops

Item 5 (line 55): *"`src/data/shops.ts` ships empty by design."*

`src/data/shops.ts` contains exactly **20 populated shop records** (verified
by counting `kind:` array openings, cross-checked against `independent:` and
`verification:` field counts, both of which also total 20). This item is
either very stale or was written about a different, now-superseded state of
the file. `docs/ROADMAP.md` item 3 has the accurate framing: the 20 shops
exist in data but "no reader can see one" — the gap is the missing `/shops`
UI, not missing data.

### 7. `docs/research/shop-web-presence.md` describes a placeholder record that isn't in the data

Line 28 (dated 24 Aug 2026, the newest research file in the set):

> `src/data/shops.ts` also now contains an `EXAMPLE-osprey-point` placeholder
> entry (example.com, 941-555-0142). It is not a real business and is
> excluded throughout.

No such entry exists in `src/data/shops.ts` — grepped for `EXAMPLE`,
`osprey`, `555-0142` and `example.com`; zero matches. Either the placeholder
was added after this research doc was written and later removed again, or the
claim was wrong when written. Since this is the newest file in `docs/research/`,
it's the one most likely to be trusted as current — worth a one-line fix or
removal.

### 8. "20 verified businesses" (`CLAUDE.md` line 23) overstates what the data itself claims

`src/data/shops.ts`'s own `verification` field (`'verified' | 'needs_check'`)
puts the real number at **9 `verified`, 11 `needs_check`**, out of 20 total.
`docs/ROADMAP.md` already uses the more careful phrasing — "20 researched
businesses, 18 independent" (also independently confirmed: exactly 18 of 20
have `independent: true`) — which doesn't claim verification. `CLAUDE.md`'s
"moat" paragraph, though, says "20 verified businesses" flatly, which the
shop data's own schema contradicts more than half the time. This is a small
but real overclaim in the document that's supposed to be the strictest
about not outrunning the research.

**Recommendation:** change CLAUDE.md to "20 researched businesses" (matching
ROADMAP's phrasing and the shops.ts docstring's own vocabulary — "researched,
not sold") or split the count into verified/needs_check the way the data
already does.

### 9. "159 cited sources" (`CLAUDE.md` line 23) could not be reproduced by any single count in the codebase

Tried three different definitions, all against `src/data/`:

| Definition | Count | Method |
|---|---|---|
| `SourceRef`-shaped objects (`id`/`label`/`url`/`publisher`) in `sources.ts` + `locations.ts` + `shops.ts` | **82** (7 + 55 + 20) | grepped `publisher:` occurrences, the field unique to real citation objects |
| Every `url:` field anywhere under `src/data/` (citations + embedded image URLs + video/station links), minus 4 type-interface stub lines | **165** | grepped `url:` project-wide, subtracted `types.ts` interface declarations |
| The set `scripts/check-links.mjs` itself treats as "sources" (`SOURCES` registry + each location's `l.sources`, explicitly excluding shops, fish images, hazard/habitat photos) | ~62 entries before de-duplication by URL | read `collect()` in `scripts/check-links.mjs` |

None of the three is 159, and they disagree with each other by roughly 2×,
so this isn't a rounding question — "cited sources" doesn't have one settled
definition in the code, and no definition I could construct lands near 159.
This is a "moat" claim (`CLAUDE.md` line 23) repeated in the README's
implicit content and in `marketing/CONTENT_POLICY.md`'s adjacent "safe claims"
list (which, notably, does *not* itself repeat the 159 figure — only
`CLAUDE.md` does). Given how central this number is to the pitch decks in
`marketing/sales/`, this needs a real, defined count, not a recollection.

**Recommendation:** decide what "a cited source" means (probably: every
`SourceRef` object attached to a location, shop or the central registry, i.e.
the 82 figure, deduplicated by URL), write a one-line script or test that
counts it on demand, and use that number everywhere. Until then, do not repeat
"159" in any new outward-facing material — `marketing/CONTENT_POLICY.md`'s own
rule ("Any fishing fact not already in `src/data/`... Quote the researched
string; never paraphrase") arguably applies to this number too.

### 10. Test count: three documents, three numbers, none confirmable in this session

| Doc | Claim |
|---|---|
| `CLAUDE.md` (implied via HANDOFF cross-ref) / `docs/HANDOFF.md` line 5 | **316 tests passing**, dated 24 Aug 2026 |
| `docs/NEXT_SESSION.md` line 49 | "316 tests across 16 suites" |
| `docs/ROADMAP.md` line 34 | **278 passing**, dated 22 Aug 2026 |
| `README.md` line 154 | **243 passing**, undated |

**Suite count (16) is independently confirmed:** exactly 16 files match
`src/test/**/*.test.{ts,tsx}` project-wide (10 `.test.ts` + 6 `.test.tsx`,
listed by name in the working notes for this review). So "16 suites" in
`docs/NEXT_SESSION.md` is solid.

**Individual test count could not be run** — no shell tool was available this
session (see note at top). Static counts of `it(`/`test(` call sites total
175 across the 16 files, but several suites use `it.each(...)` over
data-driven arrays (`LOCATIONS` — 25 items, `FISH` — 11 items, and 6 separate
`it.each(plates)` blocks in `idplate.test.tsx`), each of which expands to many
more actual test cases at runtime than the single call site suggests. So 316
is structurally plausible and higher than the static floor of 175, while 243
looks low given the same expansions — but this is inference, not a run.
Dates align with 316 being the most current (HANDOFF is the newest doc, dated
24 Aug) and 243 being the oldest (README's "Verified state" section carries no
date at all, which is itself a smaller issue — see Gaps below).

**Recommendation:** run `npm test`, get the real number, and apply it to
`CLAUDE.md`, `docs/HANDOFF.md`, `docs/NEXT_SESSION.md`, `docs/ROADMAP.md`, and
`README.md` in the same pass, dated. Do not trust any of the three existing
figures without that run.

---

## CONFIRMED — accurate, leave alone

Checked directly against `src/data/` and code, not just re-read:

- **25 spots.** Exactly 25 `slug:` entries in `src/data/locations.ts` (27 raw
  matches include one type-interface line and one derived-object line).
- **11 documented species.** Exactly 11 `id:` entries in `src/data/fish.ts`.
- **104 species-per-spot recipes.** Exactly 104 `RawTarget` entries across all
  25 locations' `targets: [...]` arrays (105 raw `species:` matches include
  one interface declaration) — an exact match to the claimed figure.
- **20 shops / 18 independent.** Confirmed both counts directly: 20 `Shop`
  records, of which 18 have `independent: true` and 2 (`safe-harbor-regatta-pointe`,
  `st-pete-municipal-marina`) have `independent: false`. Matches
  `docs/ROADMAP.md`'s "20 researched businesses, 18 independent" exactly.
- **6 Handle With Care species.** Exactly 6 `id:` entries in `src/data/hazards.ts`
  (catfish, stingray, lionfish, barracuda, sharks, pufferfish).
- **18-species photo ID claim in README.** 11 + 6 + 1 (kingfish, the sole
  entry in `src/data/namedTargets.ts`) = 18, and the README's account of
  "sheepshead, pompano, jack crevalle and Spanish mackerel have since been
  promoted... into full species pages" matches `namedTargets.ts`'s own code
  comment almost verbatim. This section of README is current even though the
  surrounding deploy section is not.
- **`docs/ROADMAP.md`'s content-coverage line** — seasons 24/25, access 25/25,
  safety 21/25, sources 25/25 — verified field-by-field against
  `locations.ts` and all four numbers are exactly right.
- **"Twelve held review items."** `docs/REVIEW_DECISIONS.md`'s "What still
  needs you" list has exactly 12 line items and its own summary table says
  "Needs info: 12" — both match `CLAUDE.md` and `docs/ROADMAP.md`'s "twelve
  held research items" claim. (See Gaps below for a quality issue inside this
  same list.)
- **249 total review items, 182 accepted, 12 needs_info, 55 skipped.**
  `src/admin/data/review-seed.json` has exactly 249 entries; status counts
  match `docs/REVIEW_DECISIONS.md`'s table exactly.
- **12 migrations, 4 Edge Functions.** `supabase/migrations/` has exactly 12
  `.sql` files; `supabase/functions/` has exactly 4 (`identify-fish`,
  `refresh-conditions`, `delete-account`, `admin-users`) — matches
  `docs/NEXT_SESSION.md`'s kickoff brief for `backend-engineer` exactly.
- **"Location never leaves the device."** `src/lib/geo.ts` carries exactly the
  binding comment `CLAUDE.md` describes, including the "do not add a network
  call that takes `coords`" instruction.
- **Account gate is a UI gate, documented as such.** `docs/HANDOFF.md`'s
  "Decisions made this session" section states this in the same words
  `CLAUDE.md` uses, and `src/pages/Privacy.tsx` (line 22-27) frames it the
  same way to end users.
- **Naming decision itself.** `docs/NAMING.md`'s methodology, evidence and
  final recommendation (Shorebound) are internally consistent, well-sourced,
  and match the shipped state (`package.json` name, live domain, `CLAUDE.md`
  title). The only problem with this document is that a sibling document
  (ROADMAP item 1) hasn't caught up to it — see Drift #3.
- **`marketing/CONTENT_POLICY.md`'s "safe, strong claims" list** (25 spots,
  offline, location-on-device, live NOAA/NWS, safe-handling) — every one of
  these is independently verifiable in the code and none of them repeats the
  disputed 159-sources figure. This document is tight and should be left
  alone.
- **`marketing/config.json` / `marketing/README.md` approval gate** — matches
  `marketing/CONTENT_POLICY.md`'s description of the two-condition publish
  gate (`autonomous_posting: true` AND `status: approved`) exactly; currently
  `false`, consistent with "several batches reviewed by hand first."

---

## Gaps — missing, and a new contributor would have no way to get this from the code

1. **No CHANGELOG.md anywhere in the project.** For a product with 7 major
   `package.json` version bumps, a live production site, and a swarm of
   agents making changes across sessions, there is no single place recording
   what shipped when. `docs/HANDOFF.md` partially serves this purpose but is
   overwritten/replaced each session rather than appended to, so historical
   entries are lost once a new HANDOFF is written. Worth a real
   `CHANGELOG.md` per the standards this role is meant to hold to.

2. **`README.md`'s "Verified state" section (lines 150–161) carries no date.**
   Every other "state of the build" claim in this project (ROADMAP,
   REVIEW_DECISIONS, the research files) is stamped with the day it was
   verified. This section isn't, which is exactly how it went three doc-cycles
   stale (243 tests, 21 precache entries, GitHub-Pages-era link-check
   references) without anyone noticing. Any rewrite should add a date and keep
   it current, or delete the section in favor of a single "last verified"
   line CLAUDE.md already half-provides.

3. **`scripts/check-links.mjs` references a `KNOWN_ISSUES.md`** (comment,
   line 9: "KNOWN_ISSUES.md #2 — many images are hotlinked...") **that does
   not exist anywhere in the repo.** Either the file was never created, or it
   was deleted/renamed and the comment wasn't updated. Not a docs/ file
   directly, but it's a broken doc cross-reference a new contributor would
   hit while reading the one script this whole content-integrity story
   depends on.

4. **No infrastructure doc separate from `docs/COST.md`.** `docs/COST.md`
   covers the two API bills (Claude Code agents, Anthropic API for photo ID)
   well, but there's no equivalent single doc for the hosting/infra decision
   itself — why Cloudflare Workers over Pages, why static-assets mode, the
   `not_found_handling` SPA-fallback reasoning, the `_headers`-not-`_redirects`
   constraint. All of that reasoning currently lives only as comments inside
   `wrangler.jsonc` and would be lost if that file were ever regenerated
   rather than hand-edited. Per this role's brief ("document vendor/infra
   decisions... in a dedicated infrastructure doc"), this is exactly the kind
   of reasoning that should have a home in `docs/` and doesn't yet.

5. **No doc records the Supabase schema/RLS shape itself** — table list,
   which views are anon-readable, what the 12 migrations each did. HANDOFF and
   NEXT_SESSION both delegate this to the (not-yet-run) `backend-engineer`
   agent pass. Once that pass reports, its findings should get a permanent
   home rather than living only in an agent's final message.

6. **Two "handoff repo" cross-references point outside this repository.**
   `README.md` line 17 ("`src/data/types.ts`, per `docs/ARCHITECTURE.md` in
   the handoff repo") explicitly says the target lives elsewhere, so it isn't
   "broken" in the usual sense, but it's also unverifiable from inside this
   repo and there's no note anywhere saying what "the handoff repo" is or
   where to find it. A new contributor reading only this repo has no way to
   resolve it.

7. **`docs/REVIEW_DECISIONS.md`'s "What still needs you" list has internal
   redundancy that undercuts its own count.** The list totals 12 lines
   (matching the "twelve held items" claim — confirmed above), but 4 of those
   12 lines are the *same* boilerplate reason ("A secondary source on a claim
   that goes stale...") repeated verbatim for **Stump Pass alone**, and Lemon
   Bay Mangroves appears twice with two different reasons. This reads like a
   templating/merge artifact rather than four distinct outstanding questions
   about one spot. Not a factual drift — the total of 12 does match the
   claimed figure — but worth a cleanup pass so the list actually names 8–9
   distinct follow-ups instead of implying more spots are blocked than really
   are.

---

## Redundant / worth consolidating

- **Hosting/deploy description is now written in four different places**
  (`CLAUDE.md`, `README.md`, `docs/ROADMAP.md`, `wrangler.jsonc` comments,
  `.github/workflows/deploy.yml` comments) with **three different versions of
  the truth** across them. This is the single biggest source of the drift
  found in this review. Recommend picking one canonical location (`CLAUDE.md`
  already claims this role and is currently the only one that's correct) and
  having every other file either match it exactly or point to it rather than
  restating it.
- **"Where things are" (`CLAUDE.md`) vs. the `docs/` directory listing** are
  two overlapping indexes of the same doc set; not wrong, just worth
  double-checking after any rewrite that both stay in sync (e.g. `CLAUDE.md`
  doesn't currently list `docs/OPS_BACKLOG.md`, `docs/COST.md`,
  `docs/REVIEW_DECISIONS.md` or `docs/NEXT_SESSION.md` at all, even though all
  four exist and are actively used).
