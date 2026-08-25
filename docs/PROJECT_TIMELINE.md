# Project timeline — Shorebound

**Generated 2026-08-25.** This is a living document, regenerated each session
from git history and a fresh count of the code — not from what earlier docs
claim. `docs/project-timeline.json` carries the same facts as structured data
for the published tracker. Re-run the verification commands in this file's
footer before trusting any number in it; several numbers in the surrounding
docs were wrong when this was written, and are named as such below.

---

## 1. History, from git

78 commits total, `git log --reverse`, first commit 2026-08-06. Activity is
bursty, not steady: five separate days carry commits, with a ten-day silent
gap between the core build and everything after it.

| Day | Commits |
|---|---|
| 2026-08-06 | 2 |
| 2026-08-07 | 1 |
| 2026-08-08 | 2 |
| 2026-08-10 | 7 |
| 2026-08-11 | 14 |
| *(silent 08-12 → 08-21)* | 0 |
| 2026-08-22 | 21 |
| 2026-08-23 | 21 |
| 2026-08-24 | 10 |

### Phase 1 — Prototype churn (2026-08-06 → 2026-08-08, 5 commits)

Three full rebuilds in three days (`Replace old nested app with complete GCF
v4 repository`, `Rebuild GCF visual field guide v5`, `...v6`) before the stack
settled. Nothing from this phase is user-visible today; it is discovery, not
foundation.

### Phase 2 — Core build, React PWA v7 (2026-08-10 → 2026-08-11, 21 commits)

The product as it exists starts here. `Rebuild GCF as a production React +
TypeScript PWA (v7)` sets `package.json` version `7.0.0`, which is still the
current version. In these two days: the guide expanded from 15 to 25 spots
(`Extend the guide north into Tampa Bay: 10 researched Pinellas/Sarasota
spots`), species went from 5 to 11 (`Merge species expansion (5 -> 11 target
species)`), and photo species ID shipped (`Identify a fish from a photo, as an
estimate the reader confirms`). Then ten days of no commits.

### Phase 3 — Monetisation and ops scaffolding (2026-08-22, 21 commits)

One day, 21 commits. The shop directory and paid advertising were split apart
(`Separate the shop directory from what shops pay for`), the owner console
appeared with a 249-item review queue (`Move the owner console out of the app
and give it a review queue`, `Load the review queue with 249 sourced
proposals`), the free/paid capability matrix was built, and — the discipline
move — `docs/ROADMAP.md` was written (`Freeze v1 scope and add an agent whose
job is saying no`). Naming research also ran this day and killed three
previously-favoured names by collision-testing them against live search
(`Test the names against real search behaviour, and kill three of my own`).

### Phase 4 — Rebrand and accounts (2026-08-23, 21 commits)

The rename: `Rename to Shorebound and move to the root of its own domain`,
`Take GCF out of the app entirely`. Hosting moved off GitHub Pages to
Cloudflare Workers this same day (`Add the Workers static-assets config`,
`Pin wrangler instead of letting npx fetch it at deploy time`). Accounts
landed in one commit: `Accounts: sign-up, sign-in, settings, and an owner
console behind a door`. The home page and narrative were rewritten around the
"displaced angler" positioning, and the tagline settled on "Go Fish Yo'Self."

### Phase 5 — Hardening and handoff (2026-08-24, 10 commits)

Smaller fixes: an admin approval flow that doesn't wait on email, a CORS
preflight fix, a scrub of owner-only vocabulary out of the reader bundle,
reconciliation of a pasted-in agent swarm. The session ended by commissioning
six audits (architecture, backend, test-coverage, documentation,
security-privacy, QA) — the first four reports landed in `docs/review/` on
24 Aug but were **never committed**; they are still untracked in the working
tree as of this writing. The security-privacy and QA reports were returned
the same session but not written to disk until Phase 6, below.

### Phase 6 — Same-day remediation of the two most serious findings (2026-08-25, uncommitted)

`docs/review/security-privacy-review.md` and `docs/review/qa-review.md`
landed on disk this session, filling the gap noted in the previous version of
this document (no security report existed as a file; it had only been
returned as agent output). The security report is organised against NIST CSF
2.0 and is the authority for launch blockers; its verdict is **NO-GO for a
public-launch or store-submission milestone, GO to continue development**,
narrowing to three launch-blocking findings (PR-1, PR-2, PR-3). The QA
report's verdict was **Blocked on C1 and C2**.

Seven fixes were made and were independently re-verified against the code for
this update, not taken on report alone (each checked directly: file diffs
read, functions grepped, `npm run build` and `npm test` re-run):

1. **Content-integrity fix — QA's C1, the most serious finding of the whole
   six-report set.** `zones.ts` no longer infers which structure a species
   works from an uncited hand-written table (`SPECIES_PREFERENCE`, deleted)
   or a `zones[0]` fallback (also deleted). `zoneForTarget` now resolves only
   from the researched `recipe.cast_zone` field, returning `null` — meaning no
   line renders — until that field is actually populated by research.
   Confirmed: neither `SPECIES_PREFERENCE` nor `zones[0]` appears anywhere in
   `zones.ts`; `zoneForTarget` reads only `target.cast_zone`. Guarded by
   `src/test/zones.test.ts` (69 lines, new).
2. **Safety-labelling fix — QA's I1.** `Cautions.tsx` now labels researched
   safety "Checked for this spot:" on all 25 spots (was: only the 4 spots with
   no researched safety got any disclaimer at all, so researched and
   generated cautions looked identical on the other 21). The unsourced
   "roughly June to September" season claim is gone. Wade advice now checks
   `loc.access` before firing (was: fired on any grass/flat/pothole zone
   regardless of access, telling pier-only anglers to "shuffle, don't step").
   Confirmed by reading the current file.
3. **Admin-takeover fix drafted — Backend's C1 / Security's implicit PR-0.**
   New migration `20260825090000_admin_claim_requires_confirmed_email.sql`
   moves the admin grant from `auth.users` insert to `email_confirmed_at`
   becoming non-null, and retracts any admin row held by an unconfirmed
   account. Confirmed by reading the migration.
4. **`admin_notes` leak fix, and a second bug found while fixing it —
   Security's PR-2.** New migration
   `20260825091000_lock_admin_notes_and_restore_admin_writes.sql` revokes
   blanket `SELECT` on `shop_listings`/`ad_campaigns` and hands back only
   public columns; the owner console now reads `admin_notes` through
   `admin_list_shop_listings()`/`admin_list_ad_campaigns()`, security-definer
   RPCs that check `is_admin()`. Confirmed both RPCs are called from
   `src/admin/Shops.tsx` and `src/admin/Ads.tsx`. **The same migration also
   restores `insert, update, delete` grants to `authenticated`** — the
   original 22 Aug migration had revoked writes with no grant back, so the
   owner console's Save had been failing at the grant layer since that day,
   independent of any RLS policy. This was never in any of the six audits;
   it surfaced only while fixing PR-2.
5. **Photo ID CORS fix — Security's PR-3, same as Architecture's C3.**
   `https://shorebound.fish` added to `identify-fish`'s `ALLOWED_ORIGINS`;
   `functions.cors.test.ts` now asserts the origin list, not just the header
   list. Confirmed by reading both files (previously verified in the prior
   version of this document, unchanged since).
6. **Offline-gate fix — Architecture's C2.** `RequireAuth.tsx` now lets a
   signed-out reader through when `useOnline()` is false; `/care` moved to the
   permanently-ungated route group in `App.tsx` (confirmed: `/care` is not
   inside any `<Gated>` wrapper).
7. **Service-worker PII-caching fix — Security's PR-6.** The Supabase runtime
   cache rule in `vite.config.ts` is now an endpoint allowlist
   (`locations`, `tide_latest`, `weather_latest`, `shop_listing_public`,
   `ad_campaign_public`, `app_config`) instead of matching the whole
   `*.supabase.co` origin — `/auth/v1/user` and `/rest/v1/profiles` no longer
   land in Cache Storage. Guarded by `src/test/sw.cache.test.ts` (75 lines,
   new), confirmed present and asserting the old wide pattern is absent.

**Two facts the "FIXED" label does not convey, both confirmed directly:**

- **None of this is committed.** `git status --short` shows 27 modified or
  untracked paths and `git log` still ends at `ee8b24f`, the same commit as
  before this remediation started. Everything above exists only in the
  working tree of the machine this session is running on.
- **The two security-fixing migrations have not been pushed to the live
  Supabase project.** `npx supabase migration list` was run directly against
  the remote project: every migration through `20260823140000` shows a
  matching `remote` timestamp, but `20260825090000` and `20260825091000`
  both show `"remote": ""`. **The admin-takeover trigger and the
  `admin_notes`-readable-by-anon condition are still live in production
  exactly as the security review found them** — the vulnerable
  `20260823120000` migration is the one actually running. Fixing a file in
  the repo did not fix the database.

`npm run build` and `npm test` were re-run for this update, on the settled
tree (no concurrent process editing this time): **clean build, 340 tests
passing across 18 files.**

---

## 2. Verified current state (this run, not restated from docs)

| Claim | Docs say | Verified now | Verified? |
|---|---|---|---|
| Tests passing | 316 (HANDOFF, 24 Aug) / 278 (ROADMAP, 22 Aug) / 243 (README, undated) | **340 passing, 18 files**, re-run on 2026-08-25 against HEAD `ee8b24f` plus the uncommitted Phase 6 changes, tree settled (no concurrent edits this run) | Yes, at time of writing — re-run before trusting; this number has moved four times in two days |
| Build | "green or revert" | Clean, re-run on the settled tree | Yes, at time of writing |
| `check:db-sync` | — | Clean: 25/25 locations, 15/15 stations, 15/15 `tide_latest` rows, zero drift in either direction | Yes |
| Spots | 25 | **25** (`grep -c "^\s*slug:" src/data/locations.ts` = 27, minus 1 interface line and 1 derived-object line) | Yes |
| Species pages | 11 | **11** (`id:` entries in `src/data/fish.ts`) | Yes |
| Handle-with-care species | 6 | **6** (`id:` entries in `src/data/hazards.ts`) | Yes |
| Species-per-spot recipes | 104 | **104** (`species:` occurrences in `locations.ts`, 105 raw minus 1 interface line) | Yes |
| Shops, total | 20 researched, 18 independent | **20 total, 18 independent, 2 not** (`verification:`/`independent:` field counts) | Yes |
| **Shops, verified** | **"20 verified businesses" (CLAUDE.md)** | **9 `verified`, 11 `needs_check`** | **CLAUDE.md's claim is false. ROADMAP's phrasing ("20 researched," no verification claim) is accurate.** |
| Cited sources | "159 cited sources" (CLAUDE.md) | **Not reproducible.** 82 `SourceRef`-shaped objects (`publisher:` field, the closest thing to a defined citation) across `sources.ts` (7) + `locations.ts` (55) + `shops.ts` (20). Every `url:` field anywhere in `src/data/` (a much looser count, includes images/videos/stations) comes to 169. Neither is 159, and the two differ by 2×, so this isn't a rounding gap — there is no single definition in the code that produces 159. | **No. Stop repeating 159 until a defined count exists.** |
| Deploy URL in ROADMAP | `https://gitjdevenyns.github.io/GCF/` | Stale. Live site is `https://shorebound.fish` (Cloudflare Workers) since Phase 4, confirmed in `CLAUDE.md`, `wrangler.jsonc`, and the deployed app itself | ROADMAP line 35 not yet updated |
| ROADMAP item 1 naming recommendation | "Recommendation: Read the Water" | Overridden. `docs/NAMING.md` (same doc ROADMAP cites as authoritative) rejects Read the Water outright as a dead name; `docs/HANDOFF.md` records the actual decision, "Name stays Shorebound," three days later. ROADMAP was never updated after the decision it itself asked for. | ROADMAP line 55 not yet updated |

**Update, 2026-08-25:** the previous version of this document noted no
security-privacy-reviewer report existed as a file. It has since been written
to disk (`docs/review/security-privacy-review.md`), along with a QA review
(`docs/review/qa-review.md`) — both dated 24–25 Aug and marked as recorded
after the fact from the reviewer's own report output. `docs/review/` now
holds all six: architecture, backend, test-coverage, documentation,
security-privacy, QA. The security report **does** issue an explicit verdict
in those words: *"NO-GO for a public-launch or store-submission milestone.
GO to continue development,"* narrowed to three launch-blocking findings
(PR-1, PR-2, PR-3 — see §4). This is now the authoritative source for launch
blockers; the backend review's overlapping findings (its C1/C2) are the same
underlying issues described from a different angle and are folded into §4
under the security report's numbering.

---

## 3. The six v1 items (`docs/ROADMAP.md`)

### 1. Name, domain, email — **partial**
Name and primary domain are settled and live: Shorebound, `shorebound.fish`,
decided 22–24 Aug, shipped in Phase 4. Email is not: `docs/HANDOFF.md` records
sign-up as currently broken for real users (`over_email_send_rate_limit`,
Supabase's built-in mailer), `shorebound.app` returns a 525 and was never
provisioned, and the `gofishyoself.com` redirect has not been set up. All
three are owner-blocked (see §5). ROADMAP's own item 1 text is also stale —
it still recommends a name (`Read the Water`) that `docs/NAMING.md` killed and
that the project moved past three days later.

### 2. Privacy policy and support pages — **done, with three confirmed defects**
`src/pages/Privacy.tsx` and `src/pages/Support.tsx` exist, are routed, and are
substantive. Three problems sit inside "done," now confirmed by both the
documentation and the security-privacy review: Privacy.tsx states "Hosting
is GitHub Pages" — wrong since Phase 4, and this is a page cited as an App
Store 5.1.1(i) compliance artifact, so the wrong claim is user-facing, not
internal. `SUPPORT_EMAIL` points at `support@shorebound.app`, a domain
confirmed broken (see item 1) — whether that mailbox receives mail has not
been confirmed, and Guideline 1.5 requires a working support contact. The
security review adds a third, more pointed one: Privacy.tsx still says "we
have no record of you to produce, correct or delete" a few paragraphs after
describing the account record it holds — pre-accounts language that
contradicts the page's own current content on a page whose whole job is to be
exactly right.

### 3. The shop directory, visible to readers — **built, breaks in two independent ways**
Shipped in Phase 3. Two separate, now both-confirmed defects, from two
different reviews: (a) the architecture review's C4 — `useShopListings.ts`
filters the entire bundled, verified 20-shop directory through a live
Supabase read; with no network, every shop disappears. Not yet fixed. (b) the
QA review's C2 — independent of the listing data, 10 of 11 species-page
images, all 6 hazard images and all 8 habitat photos are remote hotlinks
outside the service worker's precache glob (`jpg`/`jpeg`/`webp` are excluded),
so they render as broken-image icons with no connection — this is the fish-ID
plate and the Handle With Care cards, not the directory, but it is the same
"works with zero network" premise failing on a second, larger surface. **QA's
verdict named this the one CRITICAL item still open** after C1 was fixed.
Neither defect is fixed as of this writing. The `admin_notes` exposure on the
shop-listing tables that a prior version of this document also flagged under
this item (architecture's framing) has a drafted fix (§1, Phase 6) that is
not yet applied to the live database — see §4.

### 4. Store packaging — **not started**
`store/` contains one icon (`icon-1024.png`) and a logo-concepts folder.
No screenshots per device class beyond a single regeneration commit on 24 Aug,
no listing copy file, no age rating, no category decision recorded anywhere
checked.

### 5. The wrappers — **not started**
No Trusted Web Activity config, no Capacitor/Cordova project, no `.aab`, no
iOS wrapper project found anywhere in the repository.

### 6. The twelve held review items — **still 12, unresolved**
`docs/REVIEW_DECISIONS.md`'s "What still needs you" list has exactly 12
lines, matching the claimed count. Worth knowing before phoning anyone: four
of those twelve lines are the same boilerplate sentence repeated for Stump
Pass alone, and Lemon Bay Mangroves appears twice with two different reasons
— so the list names roughly 8–9 distinct places, not twelve, even though the
total line count is exactly 12. The two the roadmap itself flags as mattering
most — the Palma Sola catch-and-release regulation (FWC) and Bean Point's
paid-parking vote — are both still open; the Bean Point meeting was scheduled
for 31 Aug 2026, which has not yet happened as of this writing.

**Scorecard: 1 done-with-defects, 1 partial, 1 built-but-broken-offline-in-two-
independent-ways, 2 not started, 1 unchanged.** Nothing on the six-item list
is both complete and verified sound.

---

## 4. Launch blockers, ranked

**Updated 2026-08-25.** The security-privacy review is now the authoritative
source for launch-blocking severity (it says so explicitly, and it is the
only one of the six organised against a named framework, NIST CSF 2.0). Its
verdict: **NO-GO for a public-launch or store-submission milestone, GO to
continue development**, narrowed to three findings — PR-1, PR-2, PR-3. The QA
review's independent verdict was **Blocked on C1 and C2**. Both verdicts were
issued *before* the Phase 6 remediation; this section restates them against
what is actually true now, verified directly rather than taken on report.

**Still blocking, unresolved:**

1. **CRITICAL — `refresh-conditions` is invokable by anyone holding the
   public anon key, with no rate limit of its own.** (Security PR-1, same
   underlying issue as Backend I2.) Verified: no rate-limiting, cooldown or
   ledger code exists anywhere in
   `supabase/functions/refresh-conditions/index.ts`. Unlike `identify-fish`,
   which claims a slot before spending money, this function trusts the
   platform JWT check alone — and the JWT that satisfies it is the same anon
   key shipped in the bundle. Unbounded invocation risks NOAA/NWS throttling
   the shared Supabase egress IP, which would degrade live tide/weather for
   every real visitor. **This is the single item both authoritative verdicts
   agree is the top open security blocker.** Not fixed; no draft exists.
2. **CRITICAL — offline-first fails on every species, hazard and habitat
   page.** (QA C2 — the other item both verdicts left open.) 21 of 32 catalog
   images (10/11 species, 6/6 hazards, 8/8 habitats less the one local file,
   which is also excluded by the build glob) are remote hotlinks the service
   worker's precache glob does not cover (`jpg`/`jpeg`/`webp` excluded).
   Offline, the fish-ID plate and every Handle With Care card render a
   broken-image icon. Distinct from, and larger than, the shop-directory
   offline failure (§3 item 3a) — this is the safety content CLAUDE.md says
   must be led with, not buried. Not fixed; QA notes a fix is planned next
   but it is not in this working tree.
3. **CRITICAL — production deploys through a workflow with no gate on the
   artifact that ships.** (Architecture C1, restated by Security as GV-1 and
   by QA as I7 — three independent audits converging on the same finding.)
   `.github/workflows/deploy.yml` still runs tests/typecheck/secret-grep
   against a GitHub Pages target nothing serves; `wrangler deploy` (the real
   production path) is not gated by any of it. Not fixed.

**Fixed in the working tree, verified directly against the code — but NOT
fixed in production, and NOT committed:**

4. **Admin takeover via unconfirmed email match.** (Backend C1.) A drafted
   migration exists and reads correctly (grants admin only on
   `email_confirmed_at` becoming non-null). **Confirmed via `npx supabase
   migration list` against the live project that this migration has NOT been
   pushed** — its `remote` field is empty, while every earlier migration
   including the original vulnerable trigger (`20260823120000`) shows a
   matching remote timestamp. The vulnerability is live in production right
   now.
5. **`admin_notes` (shop/ad rates and contacts) readable by anyone with the
   anon key.** (Security PR-2.) Same status as item 4: migration drafted and
   confirmed correct by reading it, **confirmed NOT pushed to the live
   database** by the same `migration list` check. Still exploitable in
   production, though latent — no rate has been typed into `admin_notes` yet,
   so there is nothing sensitive to read today. Also fixed in the same
   migration, and worth its own line: the owner console's Save had been
   silently failing since 22 Aug because writes were revoked with no grant
   back — this was in no prior audit and surfaced only while fixing PR-2.
6. **Photo species ID dead on the live domain.** (Security PR-3 / Architecture
   C3.) `shorebound.fish` added to `identify-fish`'s CORS allow-list, test
   now asserts the origin list. Confirmed in code. **Not committed**, so
   whether this is live depends on whether Edge Functions were separately
   deployed outside git — not verified either way in this session.
7. **The account gate blocks a first-run offline reader.** (Architecture C2.)
   `RequireAuth.tsx` now lets an offline `'out'` status through; `/care` moved
   to the permanently-ungated route group. Confirmed in code and in
   `App.tsx`'s route table. This one ships as part of the app bundle, not a
   database migration, so once committed and deployed it takes effect
   immediately — no separate "push to Supabase" step applies here.
8. **Service worker caches signed-out users' PII.** (Security PR-6 /
   Architecture C6.) Runtime cache rule narrowed to an explicit endpoint
   allowlist; `src/test/sw.cache.test.ts` guards against the pattern widening
   back to the whole Supabase origin. Confirmed in code. Same deploy note as
   item 7 — bundle-level, takes effect on next deploy of `main`.
9. **Content-integrity: per-species casting advice was inferred, not
   researched.** (QA C1 — described by QA as the most serious finding across
   all six reviews, since it broke the moat rule CLAUDE.md states first.)
   `SPECIES_PREFERENCE` and the `zones[0]` fallback deleted; confirmed absent.
   `zoneForTarget` now returns `null` rather than a guess until
   `recipe.cast_zone` is researched and populated — meaning **no cast-zone
   line renders anywhere in the app right now**, which is the correct
   trade-off (empty beats invented) but is itself a small content gap to be
   aware of, not a defect.

**Open, not re-litigated by the newest reviews, still real:**

10. **IMPORTANT — the cost-control registry states `identify.perDay:
    enforced: true` for a free/paid split that does not exist server-side.**
    (Architecture C5 / Security PR-4.) Confirmed still present verbatim in
    `src/lib/entitlements.ts`. Every caller gets 20/day regardless of tier;
    the global ~$6.50/day ceiling is real, the tiered one is not — and
    Security adds that `marketing/sales/pitch-deck.md` repeats the false
    tiered figure to investors.
11. **IMPORTANT — the one entitlement with a real consumer reads a
    client-writable flag.** (Security PR-5.) `ads.enabled` — the only wired
    capability out of 13 — resolves tier from `localStorage`, not the
    RLS-protected `profiles.tier`. One devtools line removes advertising the
    owner has invoiced someone for.
12. **IMPORTANT — no CSP or HSTS on the production response.** (Security
    PR-7.) Confirmed absent from `public/_headers`. More consequential than
    usual here because the session JWT lives in localStorage and the owner
    console shares the origin.

Test-coverage review adds one structural risk worth naming alongside these
rather than under it: `src/lib/conditions.ts` — the module that turns raw
NOAA/NWS payloads into what every spot's live tide card shows — has zero
tests, restated by both Security (implicitly, via DETECT) and QA (I2) as
"the single largest gap between tests passing and the live tide feature
actually working."

---

## 5. Owner-blocked — decisions and calls only the owner can make

From `docs/HANDOFF.md`, still open:

1. **SMTP for real sign-ups.** Supabase's built-in mailer is rate-limited and
   currently breaks sign-up (`over_email_send_rate_limit`). Needs Confirm
   Email turned off and/or `smtp.office365.com:587` or Resend configured —
   plus a watch for Microsoft disabling SMTP AUTH on newer tenants by
   default.
2. **`shorebound.app` returns 525.** Never provisioned. Needs Cloudflare
   SSL/TLS set to Full (strict) and the domain confirmed attached to the
   Worker.
3. **`gofishyoself.com` redirect not configured.** A Cloudflare Rules
   redirect to `shorebound.fish`, preserving path and UTM, is written down
   but not done.
4. **Shop-listing pricing** is `[PRICING — OWNER TO SET]` in
   `marketing/sales/two-pager.md`. Needs a number, a term, a founding-rate
   decision, and whether a spot-page sponsor card prices separately from a
   directory listing.
5. **The raise figure on slide 16** of the pitch deck is deliberately blank.
6. **Whether the account gate opens for a first-run offline reader**
   (architecture C2, above) — flagged explicitly by that review as a product
   decision, not an engineering one.
7. **Whether `support@shorebound.app` receives mail** — a DNS/mailbox check
   distinct from the web 525, and gates the App Store support-contact
   requirement.
8. **Whether the free/paid capability matrix screen should ship in the admin
   console at all for v1**, given nothing it currently sets changes anything
   a reader sees (architecture I2).
9. **Whether and when to push the two drafted security-fix migrations to the
   live Supabase project.** Added 2026-08-25. `20260825090000` (admin
   takeover) and `20260825091000` (`admin_notes` leak plus the broken admin
   writes) are correct on disk and confirmed via `supabase migration list`
   to be un-pushed; this is a deploy action against the live project, not
   something this environment applies on its own initiative — same category
   as the sponsorships migration in `docs/OPS_BACKLOG.md` item 9.
10. **Whether the claude.ai artifact links in `docs/HANDOFF.md`, marked
    "private until shared," are actually link-accessible.** (Security GV-2.)
    The repository that lists those IDs is public; if the links themselves
    are unauthenticated, pricing and cost material is effectively published
    already. A one-minute check, not verified in this session.

---

## 6. Found, not scheduled

Noted because it was seen, not because it belongs on anyone's list yet. The
owner decides what, if anything, happens with these.

- `src/data/locations.ts`'s type-interface and derived-object lines make
  simple grep-counts of "spots" off by two unless filtered — a `npm run
  count:content`-style script would make every future count in this document
  mechanical rather than manual.
- `docs/OPS_BACKLOG.md` item 4 (research `seasons`/`dayparts` gaps) describes
  work that is already essentially done — 24/25 and 22/25 populated, not
  10/25 and 13/25 as the backlog states. The backlog item appears to predate
  a research batch that landed without the backlog being updated.
- `scripts/check-links.mjs` references a `KNOWN_ISSUES.md` that does not
  exist anywhere in the repository.
- `docs/research/shop-web-presence.md` (24 Aug, the newest research file)
  describes a placeholder shop record (`EXAMPLE-osprey-point`) that is not
  present in `src/data/shops.ts`.
- There is no CHANGELOG.md; `docs/HANDOFF.md` is overwritten each session
  rather than appended to, so session-to-session history outside git commits
  is lost once a new handoff is written.
- `README.md:150-161` claims an axe-core WCAG audit runs across every route.
  (QA I5.) There is no axe-core dependency in `package.json` and no axe
  assertion anywhere in `src/test/`; the one occurrence of the word "axe" is
  a stale comment referring to a check the file does not contain. The a11y
  tests that do exist are real, hand-rolled landmark/alt-text checks — just
  not what the README describes.
- Dangling references to `src/lib/sponsorship.ts`, which `listings.ts`
  replaced. (Security minor.) `entitlements.ts`, `src/data/shops.ts` and
  `docs/OPS_BACKLOG.md` still point at it; one of those pointers is where
  sponsored-label enforcement is supposedly documented to live.
- `verification: 'needs_check'` on a shop has no code linkage to whether that
  shop is shown. (Security minor.) The only gate on whether an unconfirmed
  business reaches a reader is the owner-set `included` flag; one mis-click
  in the admin console publishes an unverified address.

---

## 7. Is this on track

**No single day of building was wasted, and the response to the audits was
fast and largely correct — six of nine drafted or claimed fixes were
independently verified against the code and hold up. But real remediation and
a fixed product are not the same thing yet, and the gap between them is not
small: nothing from Phase 6 is committed, and the two migrations that close
the two most serious backend security findings are confirmed, by directly
querying the live Supabase project, to still be un-pushed.** The admin-
takeover trigger and the `admin_notes` exposure are live in production right
now, exactly as the security review found them, regardless of what the local
working tree says. That is the single fact most worth the owner's attention
in this update — not because anyone did anything wrong (the fixes are
correct, and were made same-day, which is fast), but because "fixed" was
reported before "committed and deployed," and those are different claims.

Set that aside and the shape of the project is unchanged from the prior
verdict: v1 is not close on its own six-item list — two items (store
packaging, the wrappers) have not been started at all, and the shop
directory now has two independent, confirmed ways to fail offline rather than
one. The CRITICAL findings across all six audits are still mostly seam
problems from the rename and the Cloudflare move rather than new defects,
which is why same-day remediation of six of them was possible at all — this
is bounded work, not a redesign. The two items both authoritative verdicts
(security NO-GO, QA Blocked) still call open — `refresh-conditions`'s
unbounded invocation, and every species/hazard/habitat photo breaking
offline — are exactly the kind of thing this project's own lesson says is
invisible in source and obvious in a browser or a live curl; neither has been
looked at that way yet. Nothing in §4 should be treated as closed until it is
committed, pushed to the live database where that applies, and checked
against the running system rather than the local diff.

---

## Verification commands (re-run before trusting any number above)

```sh
npm run build && npm test            # green? how many tests, how many files?
npm run check:db-sync                # live data intact? (needs .env.local)
npx supabase migration list          # which migrations are drafted vs. actually pushed
git log --oneline -10                # what actually landed since this was written
git status --short                   # anything uncommitted right now?
grep -c "^\s*slug:" src/data/locations.ts       # 27 raw; 25 real spots
grep -c "id:" src/data/fish.ts                  # 11 species
grep -c "verification: 'verified'" src/data/shops.ts   # verified shops
grep -c "verification: 'needs_check'" src/data/shops.ts # unverified shops
```
