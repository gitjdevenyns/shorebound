# Shorebound — project brief

A researched shore-fishing guide for Florida's Gulf coast, St. Petersburg to
Boca Grande Pass. Offline-first PWA. Tagline: **Go Fish Yo'Self**.

Live at https://shorebound.fish (Cloudflare Workers, deploys from `main`).

## Who it is for

Not a beginner. An accomplished angler who is **displaced** — he can read a
lake at a glance and finds that none of it transfers to a pass with the tide
ripping out. He does not want to book a charter, because working it out himself
is the part he actually likes. He needs where to stand, which tide to stand
there on, what to throw, and which of these fish will injure him.

That distinction is the product. Everything else follows from it: no scores on
dials, no gamification, reasoning shown rather than hidden, and safety led with
rather than buried.

## The moat, and the rule that protects it

**This product's only asset is that its content was researched instead of
guessed.** 25 spots, 11 species pages, 104 species-per-spot recipes, 20 verified
businesses, 159 cited sources.

So: **never invent fishing content.** No species, tackle, seasons, spot advice
or safety guidance from general knowledge. An unresearched field stays empty. A
claim that outruns the researched content destroys the thing being marketed —
`marketing/CONTENT_POLICY.md` is binding on anything outward-facing.

## Hard constraints

- **Offline-first is the product.** Every design must answer: what does this do
  with no connection? Degrading gracefully is fine; blocking the app is not.
- **The bundle is public.** Everything in `src/data/` ships to the browser and
  can be read signed-in or not. Never design a privacy or access guarantee that
  depends on the bundle being secret. Real protection means data behind RLS.
- **The account gate is a UI gate**, and is documented as such. It drives
  sign-ups; it does not make content secret.
- **Location never leaves the device.** Binding comment in `src/lib/geo.ts`. No
  design may put coordinates in a network call.
- **Secrets never enter the bundle.** Anything `VITE_`-prefixed is public. The
  service role key belongs in Edge Functions and nowhere else.
- **Green or revert.** `npm run build` clean and `npm test` fully passing before
  any commit. No skipped tests, no `.only`, no lowered thresholds.

## Where things are

| | |
|---|---|
| Scope and what v1 needs | `docs/ROADMAP.md` — it exists to say no |
| Session state and blockers | `docs/HANDOFF.md` |
| Mistakes already made | `docs/LESSONS_LEARNED.md` |
| Naming decision and evidence | `docs/NAMING.md` |
| Voice and claim rules | `marketing/CONTENT_POLICY.md` |
| Positioning | `marketing/NARRATIVE.md` |
| Architecture and content rules | `README.md` |
| Research backing the content | `docs/research/` |

## Current state

Built and deployed: the guide, live NOAA tide and NWS forecast on all 25 spots,
photo species identification, accounts with a sign-up gate, a user settings
page, and a browser-only owner console (`/admin`) for the review queue, shop
listings, advertising, accounts, and the free/paid matrix.

Not done: store packaging, the Play and iOS wrappers, twelve held research
items needing phone calls. No users yet. Not on any store.

## Monetisation

Free tier with ads, a paid tier later, and paid bait-and-tackle listings as a
separate product line. Shop listings are advertising revenue invoiced direct,
so they are **not** subject to Apple IAP; a paid user tier would be. v1 ships
free with the directory as the only revenue line.

## A browser is available

`/home/johnd/.claude-browser/` — Playwright with its own sysroot. `source
env.sh` first. Use it. The three worst bugs on this project were invisible in
the source and obvious in a screenshot.
