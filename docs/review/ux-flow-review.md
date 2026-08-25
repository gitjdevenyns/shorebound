# UX, flow and information-architecture review

**Date:** 25 August 2026
**Branch reviewed:** `swarm-review-fixes`
**Scope:** structure, flow and intuitiveness of the whole reader app. Not visual
design, not copy voice — a `ui-design` agent and a copy agent are running those
lanes in parallel and nothing here should be read as instruction to them.

**Out of scope because already recorded:** everything in
`docs/review/architecture-review.md`, `qa-review.md`,
`security-privacy-review.md`, `backend-review.md`, `documentation-review.md`,
`test-coverage-review.md`. Where a finding below *depends* on one of those it is
cross-referenced, not restated.

**No new capability is proposed.** `docs/ROADMAP.md` governs. Everything below is
a reorder, a re-label, a wiring-up of something already built, or a removal. The
two places that could be read as new capability are called out and both carry a
"delete the promise instead" option.

---

## Method

Read `src/App.tsx`, all 21 pages, `Layout.tsx`, `RequireAuth.tsx`,
`AuthShell.tsx`, `NearYou.tsx`, `TargetRecipe.tsx`, `location/Cautions.tsx`,
`location/BaitNearby.tsx`, `ShopCard.tsx`, `ui/index.tsx`, `ui/Plate.tsx`,
`lib/geo.ts`, `lib/network.ts`, `lib/theme.ts`, `lib/useConditions.ts`,
`index.html`, and all six stylesheets.

Then drove the app in a real browser at **390×844** and **1440×900** — 141
screenshots, plus computed-style and bounding-box measurements and a console/
network error log per route. `LESSONS_LEARNED.md` §5 is right: five of the eight
CRITICAL items below were invisible in the source and obvious in a picture.

Findings are marked **[seen]** (confirmed in a screenshot or a measurement) or
**[source]** (structural: route graph, component order, token value).

**Two caveats on the capture.** (1) The gate was passed with a fabricated local
session, so every Supabase read returned 401 — which is *why* the raw-error leak
in **C3** was visible, but it also means live tide never populated on the online
captures. (2) A true `setOffline(true)` could not render anything, because the
dev server has no service worker; the offline captures simulate the device being
offline (`navigator.onLine === false`, every non-localhost request aborted). A
production-build offline pass is still worth doing before store submission.

Screenshots and measurements:
`/tmp/claude-1000/-home-johnd-projects-gcf-app-GCF/a0075197-cd6d-4759-b80e-6ab055e990c5/scratchpad/shots/`

---

## The core journey, counted

*"I have two hours and a car → where do I go → what is the tide doing → what do
I throw → what will hurt me."* Signed in, cold start, 390px phone:

| Step | Cost | Where |
|---|---|---|
| Open | — | `/` |
| **Where do I go** | 1 tap to grant location, 1 tap on the named spot | `Home.tsx:357-373` |
| **What is the tide doing** | 0 — first card on the spot page | `LocationDetail.tsx:258-261` |
| **What do I throw** | 0 taps, **~6,000px of scroll** | `LocationDetail.tsx:457` |
| **What will hurt me** — species | 0 — inside each recipe | `TargetRecipe.tsx:119-122` |
| **What will hurt me** — this spot | 0 taps, further scroll, 10th of 12 blocks | `LocationDetail.tsx:532` |

Two taps to the right water and the tide. That part is genuinely good and should
not be touched.

Then it breaks. Measured: **`/locations/emerson-point` is 9,581px tall at
390px** — 13.5 screenfuls once the 135px of permanent chrome is subtracted — with
no in-page navigation of any kind. A screenshot taken at 3× viewport height is
still only at "Read the structure", four sections short of the tackle. **`/`
is 4,382px.**

And the journey may not start at all: a signed-out visitor meets a wall with no
explanation (**C1**), an intermittently-connected one gets thrown out of the page
he is reading (**C2**), and the location grant is discarded on every return to
Home (**C5**).

---

# CRITICAL

## C1 — A signed-out visitor is shown a full navigation in which ten links do nothing **[seen]**

**Files:** `src/components/Layout.tsx:99-111` (desktop nav), `:167-179` (tab bar),
`:153-160` (footer); `src/App.tsx:57-70`; `src/components/RequireAuth.tsx:57-59`;
`src/components/AuthShell.tsx:24`; `src/styles/auth.css:7-9`;
`src/pages/SignIn.tsx:32-42`.

**What a user experiences.** Type `shorebound.fish`. `RequireAuth` bounces `/` to
`/signin?next=%2F` (confirmed: the capture's `gate-redirect` run landed on
`/signin?next=%2Flocations%2Femerson-point`). Because every route in `App.tsx` is
a child of `<Route element={<Layout />}>`, the sign-in page renders inside the
full app shell. The screenshot shows a stranger looking at:

- a five-slot tab bar — **Home · Spots · Water · Fish · Care** — of which four are
  gated;
- on desktop, an eight-item nav — Home, Spots, Water, Fish, Rigs + Knots, Bait +
  Tackle, Photo ID, Handle With Care — of which seven are gated;
- a footer with **Start here · About · Privacy · Support · Bait & tackle**, two of
  which are gated.

Tapping "Spots" rewrites the URL to `/signin?next=%2Flocations` and **changes
nothing on screen**, because `Navigate` uses `replace` and the destination is the
page he is already on. Same for Water, Fish, Rigs, Bait + Tackle, Photo ID, Start
here. Ten of thirteen visible affordances are silently inert, with no message.
This does not read as a gate. It reads as a broken app.

The one that *does* work — Care — is styled identically to the nine that do not,
so nothing signals that the safety page is deliberately open.

Also visible in the same screenshot: the most prominent control in the app bar on
a sign-in page is the **"◑ Dark"** theme toggle, and `.authwrap`'s
`min-height:calc(100dvh - 120px)` (`auth.css:4`) against 135px of actual chrome
leaves roughly 250px of dead space above the card.

**The specific change.** Derive the nav from `status` in `Layout.tsx`:

- when `status === 'out'`, filter `TABS` and `DESKTOP_NAV` to the ungated set
  (`/care`) and put a single primary **Create account** action in their place,
  plus a **What's inside** entry to `/welcome`;
- drop `/start` and `/shops` from the footer while signed out, or accept two dead
  links in a footer (a lower-stakes surface than a tab bar).

A filter over two arrays that already exist. No route changes, no new page, no
change to the gate itself.

---

## C2 — `/welcome` is the only page that explains the product, and it is unreachable from the door **[seen]**

**Files:** `src/App.tsx:84`; `src/components/AuthShell.tsx:24-30`;
`src/styles/auth.css:7-9`; `src/pages/SignIn.tsx:32-42`;
`src/components/Layout.tsx:156`.

The sign-in screenshot: brand lockup, "Sign in", the lede *"Your spots, tides and
settings, on whatever you are carrying"* — a sentence written for a returning
user — two fields, a button, and exactly two links: **Create one** and **Forgot
your password?**. Nothing says what this is.

`/welcome` — the page carrying the entire argument, the six questions, the hazard
list, the maintenance exhibits and the better sign-up form — is reachable by a
signed-out reader from two places:

1. the footer, labelled **About**, at the bottom of the page under a tab bar;
2. the brand lockup at the top of the auth card (`AuthShell.tsx:24`), which
   `auth.css:7-9` styles `text-decoration:none; color:inherit`. In the screenshot
   it is indistinguishable from the identical, non-linked lockup in the app bar
   40px above it.

So the funnel is: land → wall → no explanation → leave. And `/welcome`'s own
sign-up form (`Welcome.tsx:115-216`) — the one that arrives *after* the argument
and should therefore convert better — is the one almost nobody reaches.

**The specific change.**

- `SignIn.tsx:36-42` — add a third footer link: **New here? See what is in the
  guide →** to `/welcome`. One line.
- `SignIn.tsx:34` — the lede is written for someone who already knows the
  product; the page's dominant audience does not. (Wording is the copy agent's
  lane; the structural point is that this string is aimed at the wrong reader.)
- Optional and larger: send unauthenticated visitors to `/welcome` rather than
  `/signin`. That is a funnel decision — see **Needs a human call**.

---

## C3 — Raw exception strings are rendered to the reader on the flagship card **[seen]**

**Files:** `src/pages/LocationDetail.tsx:110-113`; `src/pages/Home.tsx:128-134`;
`src/components/conditions/LiveTide.tsx:231-239`.

All three interpolate the caught `error` string straight into user-facing copy:

```
Live tide data did not load{error ? `: ${error}` : ''}. The tide plan below
does not need it.
```

**What a user experiences.** The captured `/locations/emerson-point` renders, in
the "What to do here" card — the single most prominent element on the flagship
screen:

> **Could not load live data**
> Live tide data did not load: **Expected 3 parts in JWT; got 1.** The tide plan
> below does not need it.

`/tides` renders the same string inside its "Right now" card. This is a
developer-facing exception message from a JWT parser, on a fishing guide, in
front of the reader.

The capture provoked it with a fabricated token, but the mechanism is
unconditional: *any* message that reaches the `catch` in `useConditions.ts:41-46`
is printed. A PostgREST error body, a CORS failure, a `TypeError: Failed to
fetch`, a 500 payload — all render verbatim in that card. It undermines the one
thing the product sells (that it is careful), and it is a small
information-disclosure smell besides.

**The specific change.** Map the failure to a short, fixed set of human
sentences — the app already does exactly this well elsewhere:
`IdentifyFish.tsx:429-438` has eight named failure kinds with eight written
titles. Keep the raw string for `console.debug` only. Three call sites.

---

## C4 — The location page is 9,581px tall, has no in-page navigation, and puts the two questions that matter last **[seen]**

**File:** `src/pages/LocationDetail.tsx`. **Measured:** `body.scrollHeight` =
**9,581px** at 390px wide; visible content area = 844 − 65 (`.appbar`) − 70
(`.tabbar`) = **709px**, i.e. **13.5 screens**.

Order as it ships:

| # | Section | Line |
|---|---|---|
| 1 | Back link | 201 |
| 2 | Hero — satellite band, chips, name, region, **coordinates**, structures | 215 |
| 3 | **What to do here** — live tide, next turn, Open in Maps | 258 |
| 4 | Access — access card (**coordinates again**), access notes, **a second satellite map of the same place** | 265 |
| 5 | When to fish it — tide/light/season/structure, 4 general principles, FWC callout | 347 |
| 6 | Read the structure — prose, schematic, numbered zone list | 411 |
| 7 | The four stages here — tide timeline | 446 |
| 8 | **Species playbook** — the recipes | 457 |
| 9 | Knots & rigs for this page | 482 |
| 10 | **Before you go** — this spot's cautions | 532 |
| 11 | Sources | 537 |
| 12 | Where to get bait (`BaitNearby`) | 574 |

`.cols-2` only becomes a grid at 900px (`base.css:168`), so on a phone this is
one column in exactly that order.

**What a user experiences.** He is standing on the beach — he drove there, he
does not need the access card, the coordinates a second time, or a satellite map
of the ground under his feet. He needs what to tie on and what will hurt him. A
screenshot taken at three viewport-heights of scrolling is still only reaching
"Read the structure": four sections above the tackle. There is no jump nav, no
section index, no anchor list.

Sections 4–7 are well made and correctly placed **for someone planning at a
kitchen table**. They are in the wrong place for someone already on the water,
which is the state the whole product is designed around.

Two things that are *not* wrong, recorded so this is not overstated: the tide
answer genuinely is first (`:258`), and the *species* hazard is not buried —
`TargetRecipe.tsx:119-122` puts an "Angler hazard" callout inside every recipe.
It is the **spot's own** hazards — the cut that pulls seaward, the live oyster,
the boat traffic, the researched `loc.safety` strings — that sit at position 10
of 12.

**The specific change**, in value order:

1. **A jump row directly under the NowCard**, after `:261`: *Species · Structure ·
   Tide stages · Safety · Bait*. The anchors already exist (`playbook`,
   `structure`, `stages`, `before`, `bait`). ~10 lines, fixes all 25 pages
   without moving a single section. **Do this one first.**
2. **Move the Species playbook (457-480) above "Read the structure" (411)**, so
   the order reads: what to do now → what to throw → what you are standing over →
   the four stages. Structure and stages *explain* the playbook; they do not need
   to precede the need for it. Zone pins still resolve — `zonesFor(loc)` is
   computed once at `:183`.
3. **Surface the spot's researched safety at the top.** Either move the whole
   `Cautions` block to just after the NowCard, or render only `loc.safety`'s
   researched strings as a compact warn strip inside section 3 and leave the full
   block where it is. `CLAUDE.md`: safety is *"led with rather than buried."*
   Today it is tenth.
4. **Delete the duplicate satellite map at `:332-344`.** The hero at `:215-234`
   already shows the same Esri imagery at the same zoom of the same coordinates —
   the two screenshots are near-identical. Two Leaflet mounts on one page is also
   two chunk loads and two sets of tile fetches on a phone with one bar; the
   capture logged ~16 tile requests for this page.

---

## C5 — The location grant is discarded on every return to Home, and asked for again on `/start` and `/shops` **[source]**

**Files:** `src/lib/geo.ts:53-121` (component-local state, no cache, no context);
`:63-77` (the permission effect reflects only `denied`, never `granted`);
`src/pages/Home.tsx:235`; `src/pages/Start.tsx:40`; `src/pages/Shops.tsx:19`.

`useGeolocation` holds `status` and `coords` in `useState` inside whichever
component called it. There is no module-level cache and no provider.

**What a user experiences.** On Home he taps **Find a spot near me**, grants,
and the button becomes *"Emerson Point · 3.1 mi"*. He taps it, reads the spot
page, presses back — and Home remounts, `status` resets to `idle`, the hero CTA
reverts to *"Find a spot near me"* and the Near-you card reverts to the
invitation. The device permission is still granted; the app has simply forgotten.
This repeats on **every** return to Home, which on this journey is often. `/start`
and `/shops` each mount their own copy and each ask separately.

So the first step of the core journey costs a tap and a GPS wait every single
time, and the app appears to have no memory of a decision the user already made.

**The specific change.** Two parts, neither of which puts a coordinate in a
network call (`geo.ts:14-20` stays intact):

- `geo.ts:63-77` — the effect already queries `navigator.permissions`. When
  `p.state === 'granted'`, call `request()`. **No permission sheet is shown for
  an already-granted permission**, so rule 1 ("never prompt uninvited") is not
  touched — that rule exists to protect the *first* ask, and this path only runs
  after it has been granted.
- Hold the last fix in a module-level variable (or a tiny context) so Home,
  `/start` and `/shops` share one result per session instead of three.

---

## C6 — The recipe grid — the literal answer to "what do I throw" — is labelled at 9px, and so is the sponsorship disclosure **[source, token-measured]**

**Files:** `src/styles/location.css:64`; `src/styles/pages.css:261,275`;
`src/styles/welcome.css:148,248`; `src/styles/tokens.css:41-45`.

`tokens.css:41-45` states its own contract:

> `--fs-micro` is caption chrome (plate caps, credits, freshness); **`--fs-chart`
> is data labels drawn inside an SVG.**

`--fs-chart` is **9px**. Four DOM consumers in the reader app violate that
contract, and two of them matter:

1. **`location.css:64` — `.recipe span`.** The labels **RIG · HOOK · LEADER ·
   WEIGHT · BAIT / LURE · MAIN LINE · ROD / REEL / LINE · RETRIEVE** on every one
   of the 104 recipe cards. 9px, uppercase, `.09em` tracking, in `--m` grey. The
   values beside them are 13.5px. So on the flagship screen, in Florida sun,
   through polarised lenses, with wet hands, the numbers are readable and the
   labels telling him *which number is the leader and which is the hook* are not.
   (`welcome.css:148` does the same to the identical exhibit on the landing page.)

2. **`pages.css:275` — `.shopcard-tag`**, and `pages.css:261` — `.adslot-tag`.
   These render `SPONSOR_LABEL` on a paid shop listing (`ShopCard.tsx:28`). The
   disclosure is 9px muted grey; the shop name it is disclosing is `--fs-h2`,
   19px, display weight 800 (`pages.css:280`). Both files carry the comment *"The
   disclosure is part of the frame, not decoration on it"* — structurally true,
   and there is no render path that omits it, which is the hard part and is
   correct. But `security-privacy-review.md` explicitly routed *"whether wording,
   placement and **prominence** satisfy the FTC Endorsement Guides"* to a lawyer.
   A 9px disclosure at one-half the smallest body size and one-fifth the
   disclosed name is the measurable fact that question needs, and this reviewer's
   view is that it will not survive it.

**The specific change.** `location.css:64` → `var(--fs-lab)` (11px) minimum,
`var(--fs-xs)` (12px) preferred; the 2-up grid has ~165px cells at 390px and
every label still fits on one line. `pages.css:261,275` → `var(--fs-xs)` at
minimum. `welcome.css:148,248` likewise. Then `--fs-chart` has no DOM consumers
and its comment is true again.

---

## C7 — Dark is forced, the OS preference is never read, and this app is used in direct sunlight **[seen]**

**Files:** `index.html:2,8-10,24-30`; `src/lib/theme.ts:5-7`;
`src/components/Layout.tsx:121-129`; `src/styles/app.css:23-26`.

`index.html:2` hard-codes `data-theme="dark"`. The pre-paint script at `:24-30`
resolves anything that is not the literal string `'light'` to dark; `theme.ts:6`
repeats the rule. `matchMedia` is never called anywhere in the app. Measured
`body` background on both captured routes: **`rgb(5, 8, 13)`**.

The intent to support both clearly exists — `index.html:8-9` ships two
`theme-color` metas keyed on `prefers-color-scheme` and `:10` declares
`color-scheme: dark light`. So the *browser chrome* follows the OS while the app
does not, and the two can disagree on first paint.

**What a user experiences.** A phone in bright sun, in light mode, auto-brightness
maxed, opens a near-black page. A dark UI in direct sunlight is materially harder
to read than a light one — the screen cannot out-emit the sun, so useful contrast
comes from reflective difference, and a dark page has almost none. The escape is a
**34px-tall** text toggle (measured: `button "◑Dark" 72.5 × 34`) in the top-right
corner of the screen, the hardest place to reach one-handed.

**The specific change.** Two edits: `index.html:24-30` and `theme.ts:5-7` — when
there is no stored preference, use
`matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'`. Dark
remains the default for anyone whose OS says dark; the explicit toggle still
wins. Worth doing before store screenshots are taken, because it changes which
theme a reviewer sees first.

---

## C8 — Offline, four surfaces claim something that is not there **[seen]**

`CLAUDE.md` constraint 1 makes this CRITICAL. Each of these was captured with the
device offline and the bundled guide intact.

**8a. The location hero keeps its imagery caption over a blank band.**
`LocationDetail.tsx:235` renders `<span className="cap">esri world imagery ·
satellite</span>` unconditionally. Offline the Esri tiles fail (16 aborted
requests logged) and the band is flat blue hatching — with a chip on it
attributing satellite imagery that is not present. `LocationDetail.tsx:207-214`
records that the previous caption was removed precisely because it *"reads as a
broken image"*; this is the same failure, reintroduced by the replacement.
**Fix:** hide the caption when the tile layer has not loaded, exactly as `Plate`
already handles its own failure (`ui/Plate.tsx:28-32`).

**8b. The species ID plate draws numbered pins and leader lines over nothing.**
`/fish/snook` offline: the annotated identification plate — the feature with a
248-line geometry suite behind it — renders pins **1, 3, 4, 5** with lime leader
lines pointing into an empty dashed rectangle. `Plate` degrades correctly to the
empty slot (`Plate.tsx:29-32`); `IdPlate`'s mark layer does not check the same
flag, so marks survive the photo. A diagram annotating a void is worse than a
broken-image icon, because it looks deliberate. **Fix:** suppress the mark layer
when the plate has fallen back. Root cause of the missing photo is
`qa-review.md` C2 (remote hotlinks, `jpg`/`webp` absent from `globPatterns`) and
is not restated here — this is about limiting the visible damage.

**8c. The "What to do here" card says "Reading the tide…" while the bar 200px
above it says live tide is paused.** `LocationDetail.tsx:92-96` renders the
loading skeleton purely on `status === 'loading'`, and never consults
`useOnline()` — though `Layout.tsx:135-142` renders *"Offline — the full guide
still works. Live tide and weather are paused."* on the very same screen. Two
contradictory statements, one viewport. **Fix:** when offline, skip the loading
branch and go straight to the honest fallback the card already has at `:98-102`
("Plan it on the tide" + `best_window`), which needs no network at all.

**8d. `/shops` offline is two grey skeletons and then a footer.** `Shops.tsx:46-50`
gates everything on `loading`; offline the read never resolves inside any
reasonable window, so the captured page is a heading, a lede, two pulsing
rectangles and nothing else — under an offline bar promising *"the full guide
still works."* When `loading` does clear, `:52-57` says *"The directory is not
switched on yet"* — an editorial statement that is false; the truth is that 20
researched shops are on the device and a network read failed. **Fix:** split the
empty state on `useOnline()`; the offline branch should say so. The underlying
reason the bundled shops do not render at all is `architecture-review.md` C4 and
is not restated.

---

# IMPORTANT

## I1 — "Water" means two different pages depending on screen width, and `/water`, `/rigs` and `/id` have no mobile entry point **[seen]**

**File:** `src/components/Layout.tsx:17-23`, `:38-49`, and the comment at `:33-36`.

The mobile tab bar's third slot is labelled **Water** → `/tides`. The desktop
nav's third item is labelled **Water** → `/water`. Same word, two destinations,
selected by viewport. The comment at `:33-36` records a deliberate decision to
drop `/tides` from the desktop nav because *"Tides + Water" and "Read Water" read
as two entries for one thing* — but the mobile tab kept the old label and the
other target, so the collision moved rather than resolved. Both screenshots show
"Water" in the same position with different pages behind it.

Traced by grep, on a phone:

| Route | Reachable from | In the tab bar? |
|---|---|---|
| `/water` | Home's "Learn the water" rail (`Home.tsx:605-619`), a zone link (`LocationDetail.tsx:432`), the `/fish` and `/rigs` footers | No |
| `/rigs` | a spot page (`:483,488`), `/fish`, `/water`, a recipe schematic | No — **and not from Home at all** |
| `/id` | Home's tile (`Home.tsx:594`), `/fish` (`FishList.tsx:54,139`) | No |
| `/shops` | the app footer, `BaitNearby`, `/start`'s denied branch | No |
| `/start` | Home's top strip and hero, the app footer | No |

`/id` is one of the two features `docs/ROADMAP.md:88-92` builds the App Store
Guideline 4.2 case on, and it has no persistent navigation on the device class it
exists for.

**The change.** Rename the mobile tab to **Tide** — that is what it opens — and
give `/water` a door from `/tides`, which is where a reader wanting to understand
water plausibly already is. Do not add a sixth tab; five is right.

---

## I2 — `BaitNearby` is the last element on the longest page, and `/shops` is missing from Home and from the 404 index **[source]**

**Files:** `src/pages/LocationDetail.tsx:574`;
`src/components/location/BaitNearby.tsx:17-19`; `src/pages/NotFound.tsx:5-13`;
`src/pages/Home.tsx` (no `/shops` link anywhere).

`BaitNearby` renders at `:574` — *outside* any `<section className="sect">` and
*after* the Sources section. A citation list reads as the end of a document, and
this page is 9,581px long, so v1's only revenue line sits below the end of a
13-screen scroll.

`NotFound.tsx:5-13` presents itself as *"Everything in the guide"* and lists seven
routes. It omits `/shops`, `/id` and `/start`. The app's only complete index is
not complete, and what it most conspicuously omits is the thing someone is being
asked to pay for.

`BaitNearby.tsx:18` also returns `null` while `loading`, so on a slow connection
the block appears late and shoves the page; offline it never appears
(`architecture-review.md` C4).

**The change.** Move `<BaitNearby location={loc} />` from `:574` to directly after
the Species playbook closes at `:480` — "what do I throw" → "where do I buy it" is
the real adjacency. Add `/shops`, `/id` and `/start` to `NotFound.tsx:5-13`. Add
one `/shops` entry to Home; the natural slot is beside the existing `/start` top
strip (`Home.tsx:322-328`), which is already the "things you need before you
fish" band.

---

## I3 — `/locations` ignores where you are standing, though the ranking already exists **[source]**

**File:** `src/pages/Locations.tsx` — no `useGeolocation`, no `rankNearby`.

The tab bar's second slot, **Spots**, is the most obvious answer to "where do I
go", and it opens a 25-pin map plus a region/access chip filter plus a list in
fixed data order. Nothing is sorted by distance. `rankNearby()` is used by Home
(`:241,265`), `/start` (`:44`) and `/shops` (`:29`), is pure on-device arithmetic
over bundled data (`lib/nearby.ts`), and therefore works offline with no
coordinate in any request.

**What a user experiences.** He grants location on Home, gets a good answer, taps
"Spots" to see the alternatives — and gets a region-grouped list of 25 places
spanning St. Petersburg to Boca Grande with nothing indicating which are within
twenty minutes.

**The change.** Add a **Nearest first** control beside the existing Area and
Access groups (`Locations.tsx:61-111`), using the same geolocation invitation
pattern `/shops` already ships (`Shops.tsx:61-71`), and show the distance on each
`linkrow` (`:147-163`) when a position exists. Three existing modules, no new
capability.

---

## I4 — `/tides` opens on an arbitrary spot **[seen]**

**File:** `src/pages/Tides.tsx:155`, `:200-217`.

```
const [slug, setSlug] = useState(locations[0]?.slug ?? '');
```

The tab-bar destination for "what is the tide doing" defaults to whichever spot
is first in `src/data/locations.ts`. Confirmed in the capture: the selector reads
**"Emerson Point / Snead Island — Bradenton"** with no reference to the reader.
`Tides.tsx` does not call `useGeolocation` at all.

**What a user experiences.** Taps Water/Tide, reads a tide, and it is the tide at
a place he has never heard of that may be ninety miles away. The label above the
picker says only "Show the tide for" — nothing marks the default as arbitrary.

**The change.** Seed `slug` from, in order: the profile's `home_slug` (see **I5**),
the nearest spot if a position is already held (see **C5**), then `locations[0]`.
Both prerequisites are cheap and land nearby. If neither lands, at minimum make
the arbitrariness visible rather than presenting a pre-selected answer.

---

## I5 — "Home water" in Settings is a control wired to nothing **[source]**

**Files:** `src/pages/Settings.tsx:113-126`; `src/lib/auth.tsx:45,146,181`;
`src/pages/Home.tsx:41,229`; `src/pages/Tides.tsx:155`.

The Settings hint, verbatim: *"The spot the app falls back to when it cannot tell
where you are."*

Grep for `home_slug` across `src/`: six hits — three in `Settings.tsx` (the form)
and three in `auth.tsx` (the type, the row mapper, the select list). **Nothing
reads it.** Home falls back to a hard-coded `REFERENCE_SLUG = 'emerson-point'`;
`/tides` falls back to `locations[0]`; `/locations` and `/shops` have no fallback.

**What a user experiences.** He sets his home water, saves, sees "Saved.", opens
Home with location off — and is sent to Emerson Point. The UI has told him
something about itself that is not true. Same defect class as
`architecture-review.md` I2 and `qa-review.md` I4, on a surface neither covered.

**Two options, and it is a genuine choice:**

- **(a) Delete the promise.** Remove the field, or rewrite the hint to describe
  what it does today. ~3 lines, unambiguously inside `ROADMAP.md`'s rule.
- **(b) Wire it.** `Home.tsx:229` and `Tides.tsx:155` each take
  `profile?.home_slug ?? <current fallback>`. ~6 lines, uses only data already
  fetched, works offline once the profile is cached.

**Recommendation: (b)** — it is smaller than most fixes here and converts a broken
promise into a kept one. But it is arguably "wiring up a capability", so it is
the owner's call. See **Needs a human call**.

---

## I6 — `/care` leads with fishing licences; first aid is the fifth of eight sections **[seen]**

**File:** `src/pages/Care.tsx`.

Order: hero → lede → **Get a licence first** (`:57-124`, the longest block on the
page) → Three habits (`:126`) → Know them on sight (`:143`) → Wading (`:163`) →
**If something does get you** (`:177`) → Documented cases (`:196`) → One last
thing (`:228`) → Sources (`:249`).

**What a user experiences.** Confirmed in the capture: the first fold of `/care`
is a 370px empty gradient band carrying only a chip and the title, then the lede,
then a bright orange **"Visiting from out of state?"** callout about non-resident
saltwater licences. He tapped a hazard triangle — the one route deliberately
ungated for exactly this moment (`entitlements.ts:94`, `App.tsx:75-80`) — and got
licensing. Handling is a section and a half further down; "If something does get
you" is fifth.

There is also a loop: `/start` §1 (`Start.tsx:64-88`) is *also* a licence section,
and it links to `/care` for *"Full licence and permit detail →"*. The licence
content lives in two places, and the safety page is the "detail" version of the
getting-started page's step 1.

**The change.** Move the licence block to `/start`, whose stated audience
(`Start.tsx:13-27`) is exactly the reader `Care.tsx:49-56` says the block is for.
If it must stay on `/care` for reachability, move it below "If something does get
you". Either way `/care`'s first section after the lede should be identification
and handling, and the injury section should be second or third. `Start.tsx:87`
then points at whichever page ends up holding the detail. **This has a
consequence — see Needs a human call #3.**

---

## I7 — The location page states a cross-reference that no longer exists **[seen]**

**Files:** `src/pages/LocationDetail.tsx:413-417`;
`src/components/location/zones.ts:285-300`; `src/components/TargetRecipe.tsx:77-84`.

"Read the structure" opens with:

> The numbers below are used again in the tide stages and **on every species
> card**.

Since the `zones.ts` fix on this branch, `zoneForTarget` resolves only from
`recipe.cast_zone` (`zones.ts:295-296`), and **no recipe populates that field
yet** — which is correct and is exactly what `qa-review.md` C1 asked for. The
consequence is that `TargetRecipe`'s zone block (`:77-84`) renders on none of the
104 recipes. So the numbered pins appear on the structure schematic and in the
tide timeline, the page promises they recur on the species cards, and they do
not. The screenshot shows pins 1, 2, 3 on the schematic directly under that
sentence.

**The change.** Amend the sentence to match what ships — "used again in the tide
stages" — and restore the fuller claim when research fills `cast_zone`.
`zones.ts:287-293` already documents that path.

---

## I8 — The app's "go deeper" affordance is an 18px-tall text link, and the location page has ~20 of them **[seen, measured]**

**File:** `src/components/ui/index.tsx:20-32` — the trailing link is
`<Link className="xs">`, a bare 12px text node with no padding and no minimum
height.

Measured bounding boxes at 390px:

| Element | Route | Size |
|---|---|---|
| `All 11` | `/` | 38.4 × **18** |
| `Read water` | `/` | 77.2 × **18** |
| `All 25` | `/` | 38.4 × **18** |
| `All rigs` | `/locations/emerson-point` | 47.5 × **18** |
| `Tides + Water →` | `/locations/emerson-point` | 109.5 × **14** |
| `Apple Maps ↗` / `Google Maps ↗` | `/locations/emerson-point` | 104.5 / 114 × **16** |
| `NOAA Desoto Point 8726273 ↗` | `/locations/emerson-point` | 232.4 × **16** |
| `Weedless paddletail` (rig link, per recipe) | `/locations/emerson-point` | 153.7 × **16** |
| `Redfish` / `Trout` / `Snook` / `Black drum` (species links) | `/locations/emerson-point` | ~23 |
| `full handling guide` (×4) | `/locations/emerson-point` | 114 × **36.3** |
| `How to read this water →` (×3) | `/locations/emerson-point` | 190.8 × **16** |
| footer links | every page | ~ × **20.3** |
| `◑ Dark` theme toggle | every page | 72.5 × **34** |

**45 interactive elements on the location page and 26 on Home** fall below the
44px floor. Excluding Leaflet's own controls, roughly twenty of them are the
app's own content links — and inline links inside body copy are the dominant
navigation on the flagship screen.

Every other control respects `--tap: 44px` (`tokens.css:53`): `.btn`
(`base.css:65`), `.tabbar a` (`base.css:148`), `.filters .chip`
(`location.css:110`), `.chip-tap` (`pages.css:162`), `.backlink` (`app.css:46`),
`.cogbtn` (`app.css:181-183`). The discipline exists; it just stops at inline
links.

**The change.** Two tiers, both cheap:

- `SectionTitle`'s trailing link gets the treatment `pages.css:159-162` already
  documents the reasoning for: `min-height: var(--tap)`, negative margin so it
  does not push the rule, `--fs-sm`.
- Inline links inside `.kvrow .v`, `.zonelist`, `.play-b` and `.linkrow` get
  vertical padding sufficient to reach ~40px without changing the line rhythm —
  a single rule scoped to those containers. Perfect 44px inside a running
  paragraph is not achievable; 16px is not defensible.

Smaller siblings in the same family: `.iconbtn` is `min-height:34px`
(`app.css:24`) and is the theme toggle; `NearYou.tsx:91-98`'s "Try again" sets
`minHeight: 28` inline; the app bar tagline computes to **8.58px** at 390px
(`app.css:177`, `clamp(7px, 2.2vw, 10px)`).

---

## I9 — `/shops` has no empty state for its own filter **[source]**

**File:** `src/pages/Shops.tsx:52-57`, `:73-97`.

The `!loading && shops.length === 0` guard at `:52` tests the *unfiltered* list.
Selecting a kind filter that matches nothing renders an empty `.shoplist` at
`:93-97` with no message at all. `Locations.tsx:126-138` handles the identical
case correctly, with an `EmptyState` and a Clear-filters button.

**The change.** Add a `shown.length === 0` empty state modelled on
`Locations.tsx:126-138`. (The offline half of this page's empty-state problem is
**C8d**.)

---

## I10 — `/tides` still confesses a missing photo in its hero chrome **[seen]**

**File:** `src/pages/Tides.tsx:177`.

```
<span className="cap">reference · no licensed photo in this slot yet</span>
```

An internal editorial note rendered as user-facing chrome on the hero of a tab-bar
destination, in the top-right corner, over an empty blue band — clearly legible
in the screenshot. `LocationDetail.tsx:207-214` records that exactly this pattern
was removed from the location hero because it *"reads as a broken image"*, and
replaced with real satellite imagery. `/tides` was not in that pass.

**The change.** Delete the span. `/tides` is not about a place and has no
coordinates to render, so the gradient band with its chip and title is the right
answer — which is what `Care.tsx:30-38` already does with the same `.lochero`
component and no caption.

---

## I11 — The species playbook avatar is a raw `<img>` with no failure path **[source]**

**File:** `src/components/TargetRecipe.tsx:51-55`.

Every other image slot goes through `Plate` (`ui/Plate.tsx:27-40`), which carries
`onError` and falls back to the dashed empty treatment so *"an unlicensed/broken
image never reads as content."* This one does not. Given `qa-review.md` C2, the
offline result on a spot page is a column of browser broken-image glyphs down the
left edge of every recipe card — the one place on the flagship screen where a
broken picture sits beside real tackle data. `.av` already carries the dashed
placeholder background (`location.css:51-53`); the `<img>` just needs to get out
of the way when it fails.

**The change.** Add the same `onError` fallback, or render through `Plate` with
`bare`. Two lines. Limits the visible damage of QA C2 without pre-empting the
real fix.

---

## I12 — Home swaps the recommended spot, its map and its conditions card a second after load **[source]**

**File:** `src/pages/Home.tsx:229-296`, `:480-550`.

Home runs three separate `useConditions` calls — the hard-coded seed station
(`:230`), the nearest spot (`:245`) and the picked spot (`:275`) — and derives
`pick` at `:263-266` from two asynchronous results.

**What a user experiences.** The page paints with `pick = locations[0]`. About a
second later the seed resolves, `pick` changes, and three things below the hero
swap under the thumb: the heading *"{pick.name}, in detail"* (`:481`), the Leaflet
satellite map (which remounts by `key`, `:493`), and the whole conditions card
(`:549`). Granting location changes them all again.

The hero's own comment at `:299-317` insists the hero *"is not allowed to change
on load"*. That discipline is right and is not applied to the three sections
under it.

**The change.** Hold "in detail" and "Conditions now" in the skeleton state until
`conditions.status !== 'loading'` and geolocation has settled, rather than filling
them with a provisional answer that will be replaced. The `.cond` loading branch
already exists (`:109-125`); extend the same treatment to `.rec` at `:482-542`.
Secondary win: one fewer Leaflet mount and tile burst on a slow connection.

Worth a separate look: three Supabase round trips on Home's first paint, two of
which exist only to nominate which spot the third should describe.

---

## I13 — `FishDetail`'s "Where to catch one" is seventh, which is the wrong end of the reverse journey **[source]**

**File:** `src/pages/FishDetail.tsx:331`.

Order: Know it on sight → Not to be confused with → Where it lives → Tackle →
Bait & lures → Handling & release → **Where to catch one** → Knots → Sources.

Two journeys reach a species page. The forward one (*I caught this, what is it*)
is served correctly by leading with identification. The reverse one (*I want to
catch a snook, where do I go*) is fed by Home's species rail (`Home.tsx:570-580`)
and by `/fish`, and its answer is seventh.

**The change.** Promote "Where to catch one" to directly after "Where it lives"
(`:170-208`) — the same question at a different resolution. Move the block; no
content changes.

---

# POLISH

- **`Home.tsx:322-328`** — the "First time in salt water?" strip sits *above* the
  hero, so the first thing every returning user meets on every load is an offer
  aimed at first-timers. In the mobile capture it occupies ~100px of a 709px
  content area. Move it below the hero CTA.
- **`base.css:148-151`** — the tab bar's active state is `--m` → `--t`, a
  grey-to-near-white lightness shift and nothing else: no underline, no pill, no
  accent. Visible but weak in the screenshots and close to invisible in sun.
  Every other selected state in the app uses the accent fill (`app.css:36`,
  `app.css:126`).
- **`Locations.tsx`** — 25 spots, region and access filters, no text search. A
  reader who already knows the name of the place he is driving to has to scan
  four region groups.
- **`NearYou.tsx:53-54`** — hardcodes *"the guide's 25 spots"* while
  `locations.length` is in scope two lines away. `Welcome.tsx:19-22` documents the
  rule and `Home.tsx:345` follows it. A `marketing/CONTENT_POLICY.md`-adjacent
  drift risk the moment a 26th spot lands.
- **`LocationDetail.tsx:251-254` vs `:279-283`** — the coordinates are printed
  twice within one scroll, in the hero and again in the Access card.
- **`Care.tsx:30-38`** — the `/care` hero is a ~370px empty gradient band carrying
  only a chip and a title. On a 709px content area that is more than half the
  first fold spent on nothing, on the page that has to work fastest.
- **`auth.css:4`** — `.authwrap`'s `min-height:calc(100dvh - 120px)` is computed
  against 120px of chrome; the real total is 135px (65 + 70, measured), which
  pushes the card down and leaves ~250px dead above it on a phone.
- **`Welcome.tsx:640-663`** — two store buttons that say "Placeholder" and go
  nowhere. Honest and correctly captioned at `:629-633`, but they are the last
  interactive elements on the landing page, so the pitch closes on two disabled
  buttons. Consider dropping them until there is a listing.
- **`Tides.tsx:200-215`** — the spot selector is a native `<select>` over 25
  options styled as `.iconbtn`. It works, but it is the only native picker in the
  app and it stands between the reader and the one live number on the page.
- **`Layout.tsx:135-142`** — the offline bar sits between the app bar and `<main>`
  and pushes the whole page down when it appears. Since `useOnline` flips on a
  window event, this reflows mid-read on a flickering signal. Reserve its height
  or overlay it.
- **`LocationDetail.tsx:147-164`** — on desktop the two NowCard buttons use
  `.grow`, so "Open in Maps" and "Tide chart" stretch to ~500px each. Cap them.
- **Chrome budget** — `.appbar` 65px + `.tabbar` 70px = **135px, 16% of a 390×844
  phone**, permanently. Both are `position: sticky`. The app bar carries a 34px
  logo, a name, a 8.58px tagline, a cog and a theme toggle; on a phone the tagline
  and the toggle are the two least useful things on screen and together they cost
  most of that 65px.

---

# Suggested order

Ranked by journey damage divided by size of change.

1. **C6** — one token in one line, plus two in `pages.css`. The answer to "what
   do I throw" becomes legible and the sponsorship disclosure stops being 9px.
2. **C3** — three call sites. Stops printing JWT parser errors on the flagship
   card.
3. **C2** — one link. Makes the product explicable to a stranger.
4. **C4.1** — the jump row under the NowCard. ~10 lines, fixes a 9,581px page for
   all 25 spots without moving a section.
5. **C7** — two lines, and it changes what a store reviewer sees first.
6. **C1** — filter two arrays. Fixes first-run entirely.
7. **C8a–c** — hide the caption, hide the orphan pins, skip the loading branch
   offline. Small, and each is a direct constraint-1 violation.
8. **I2** — move `BaitNearby` up, add three routes to the 404 index. The revenue
   line stops living below the citations.
9. **C5 → I5 → I4** — geolocation persistence, then `home_slug`, then the `/tides`
   default. These compound; each makes the next cheaper.
10. **C4.2–4.4** — the section reorder and the duplicate map. Bigger; re-shoot the
    page afterwards.
11. **I1, I6, I7, I8, I9, I11** — nav labels, `/care` order, the false
    cross-reference, tap targets, empty states, the raw `<img>`.
12. **C2 (offline latch)** — grouped here only because it needs a decision on
    whether the funnel tolerates it; the code change itself is five lines and
    could be item 3.
13. POLISH, opportunistically, alongside the `ui-design` lane.

Items 1–8 are together well under a day and clear every CRITICAL except the
location-page reorder.

---

# Needs a human call

1. **Should an unauthenticated visitor land on `/welcome` rather than `/signin`?**
   (**C1/C2**.) A funnel decision, not an engineering one. Today the wall comes
   before the argument, which is the ordering least likely to convert — and also
   the ordering that produces the most sign-ins from people who already have
   accounts. `architecture-review.md` C2 flagged the adjacent question and it is
   still open; decide both together rather than twice.

2. **Wire `home_slug`, or delete the field?** (**I5**.) Wiring is ~6 lines and
   makes two screens keep a promise the UI currently breaks. Deleting is ~3 lines
   and is unambiguously inside the "no new capability" rule. Either is
   defensible; leaving it as-is is not.

3. **Is the licence content allowed to move off `/care`?** (**I6**.) `/care` is
   ungated by an explicit, tested, load-bearing decision (`entitlements.ts:94`,
   `App.tsx:75-80`). Moving licence detail to `/start` puts it back behind the
   account gate. That may be right — a licence is a planning question and
   `/start` is the planning page — but it is a deliberate reduction in what a
   signed-out reader can see, and should be decided rather than absorbed.

4. **Does `/water` deserve a mobile entry point, or is it reference material?**
   (**I1**.) Eight researched habitat modules with diagrams and licensed
   photographs, and a phone user has no way to browse to them. Either it is a
   section and needs a door, or it is reference and the desktop nav should stop
   presenting it as a peer of Spots and Fish.

5. **Is a 9px sponsorship disclosure defensible?** (**C6**.)
   `security-privacy-review.md` routed disclosure *prominence* to a lawyer. This
   review supplies the measurement — 9px muted grey against a 19px display-weight
   shop name — and the recommendation to raise it before the first listing is
   sold, but whether the current form satisfies the FTC Endorsement Guides is a
   legal determination, not a design one.
