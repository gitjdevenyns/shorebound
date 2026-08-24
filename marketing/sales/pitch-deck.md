# Shorebound — Shore Fishing Guide

Partner / investor deck. Pre-launch, 23 August 2026.

**Reading rules for this document.** Every claim about the product names the
repository file it can be checked in. Every market claim names a source URL.
Where no credible figure exists, it says so rather than estimating. That is not
decoration — the product's only asset is that its content was researched instead
of guessed, and a deck that outruns the content destroys the thing being pitched
(`marketing/CONTENT_POLICY.md`).

---

## Slide 1 — You already know how to fish. You just don't know this water.

**Shorebound — Shore Fishing Guide**

A researched shore-fishing guide for Southwest Florida's Gulf coast.
St. Petersburg to Boca Grande Pass. 25 spots, 22 of them reachable on foot.

Pre-launch. No users yet. Not on any app store.

**Speaker note:** Open by saying the pre-launch part out loud, in the first
thirty seconds, before anyone has to ask. There is no traction slide in this deck
and there is no revenue line, because there are neither. What there is instead is
a finished, tested product and a body of researched content that took real work
to produce and would take a competitor the same work to copy. The rest of the
deck is about why that content is the defensible thing and what it takes to get
it in front of people.

---

## Slide 2 — The person this is for

He has twenty years on him. He can read a lake at a glance — where the bottom
changes, where the shade line falls, what a wind out of the north does to a
point. He owns rods he has opinions about.

Then he stands on a Florida beach with a pass ripping out in front of him and
**none of it transfers.**

- The water moves twice a day and that turns out to be the whole game.
- The structure is oyster and mangrove and bridge piling instead of timber and
  weed line.
- The fish are different fish.
- Several of them will hurt him and nobody has mentioned which.

**He is not a beginner. He is displaced. Those need completely different tools —
and everything on the market is built for the first one.**

**Speaker note:** This is the whole thesis and every other slide has to earn it
(`marketing/NARRATIVE.md`). The distinction matters commercially, not just
editorially: a beginner wants to be told what to do and will accept a score on a
dial. A displaced expert wants the reasoning, will notice immediately when an app
is guessing, and is the harder customer to fool and the easier one to keep. He
also will not book a charter — not because of the money, but because working it
out himself is the part he actually likes, and paying someone removes it. That is
the customer who has nowhere to go today.

---

## Slide 3 — What he asks, in the order he asks it

Half five in the morning, in a car park, coffee going cold.

1. **Where do I go?**
2. **When?** — tide stage, which freshwater never taught him
3. **What am I standing over?** — oyster, grass, mangrove, piling, a pass
4. **What will I catch?**
5. **What do I throw at it?** — rig, hook, leader, weight, bait
6. **What do I do when it is on the sand?**

Question six is the one nobody prepares him for. **Six species on this coast will
injure him** (`src/data/hazards.ts`).

**Speaker note:** The app is built in this order and so is the landing page
(`src/pages/Welcome.tsx`). Question six is worth dwelling on because it is the
emotional centre of the product and the reason the free tier is shaped the way it
is. A hardhead catfish has a serrated, venom-associated spine and people pick
them up bare-handed every day. A snook's gill plate will open your hand while you
are being careful. Stingrays are under the sand. That guidance is free
permanently, for everyone, and a test in the repo fails the build if anyone
changes it (`src/test/entitlements.test.ts`). It is the right thing to do and it
is also the single most shareable thing in the product.

---

## Slide 4 — How many people are him: the US number

**He is the common case, not the niche one.** In 2022 there were **35.1 million
freshwater anglers** in the US and **12.7 million saltwater anglers** — verbatim:
"Saltwater fishing attracted 12.7 million anglers who enjoyed 104 million trips
to saltwater on 123 million days"
([USFWS, 2022 National Survey of Fishing, Hunting and Wildlife-Associated
Recreation](https://www.fws.gov/sites/default/files/documents/Final_2022-National-Survey_101223-accessible-single-page.pdf)).

**And saltwater fishing is overwhelmingly done from the shore.** From NOAA's
2023 economic report, verbatim:

> Anglers took 204 million saltwater fishing trips. […] Approximately 62 percent
> of fishing trips were taken via shore.

> Expenditures on shore-based fishing trips had the greatest trip-related
> economic impact (when compared to private boat or for-hire trips).

Economic impacts of trip expenditures by mode, 2023 — jobs and sales impacts
($ millions), NOAA Table 6:

| Mode | Jobs | Sales impacts |
|---|---|---|
| **Shore** | **57,282** | **$11,911M** |
| For-hire | 42,599 | $5,490M |
| Private boat | 38,244 | $10,805M |

Trip expenditure split: **shore 43.6%**, private boat 40.2%, for-hire 16.2%.

All NOAA figures: [Fisheries Economics of the United States 2023, NMFS-F/SPO-254A,
updated May 2026](https://www.fisheries.noaa.gov/s3/2026-07/feus-2023-spo254a.pdf)
([summary page](https://www.fisheries.noaa.gov/national/sustainable-fisheries/fisheries-economics-united-states)).

**Speaker note:** Two definitional traps, and name them before anyone else does.
First, NOAA's 204 million and the Fish and Wildlife Service's 104 million are not
in conflict — NOAA counts *angler-trips*, one angler for one day; FWS counts
trips that may span several days. Never mix them in one sentence. Second, NOAA
publishes no unique-angler count at all, so 12.7 million is a FWS person-count
and 204 million is a NOAA trip-count, and they are different instruments. The
honest read of the two tables together is this: the shore is where most saltwater
fishing actually happens, and it is the *cheapest* mode — 62 percent of trips but
43.6 percent of trip spend. If someone pushes on the wallet gap, concede it
immediately. Our answer is not that shore anglers spend more; it is that nobody
has built the tool they use, and the bait they buy is bought locally, which is
the revenue line.

---

## Slide 5 — Florida, and specifically this coast

**West Florida is the single biggest recreational fishing market in the country.**
From NOAA's 2023 report, verbatim:

> West Florida anglers took the most fishing trips (45 million trips), followed
> by those in East Florida and North Carolina.

> West Florida was the largest contributor by far, highlighting its major role in
> the recreational fishing economy.

Jobs and sales impacts from recreational **trip** expenditures, 2023 (NOAA Table 7):

| Region | Jobs | Sales impacts |
|---|---|---|
| **West Florida** | **30,844** | **$4,580M** |
| North Carolina | 10,928 | $1,452M |
| East Florida | 10,906 | $1,702M |
| Texas | 8,615 | $1,238M |
| California | 5,028 | $724M |

**West Florida is the largest row in that table — this app's 25 spots are inside
it.**

**The visitors are here too.** Florida recorded **143.3 million visitors in 2025**
([VISIT FLORIDA / Office of the Governor, 20 February 2026](https://www.visitflorida.org/about-us/media/news-releases/article-details/?releaseId=21303)).

**And Florida already sells this exact customer a product.** Saltwater licence
fees, current ([FWC](https://myfwc.com/license/recreational/saltwater-fishing/)):
non-resident **3-day $17.00**, **7-day $30.00**, annual $47.00; resident annual
$17.00; resident shoreline-only **no cost**. FWC also reports **1.5 million
recreational saltwater licences sold and $37.8 million in licence revenue in FY
19/20**, with **2.4 million** people holding an active recreational licence
([FWC](https://myfwc.com/conservation/value/saltwater-fishing/)).

**What is not verified, and is not estimated here:**

- **Florida non-resident saltwater licence sales volume — no credible figure
  found.** FWC does not publish a resident/non-resident split, and the USFWS
  federal-aid licence tables carry no Florida saltwater breakout.
- **Share of Florida visitors who fished — no credible figure found.** VISIT
  FLORIDA's published activity list (beach/waterfront 36%, culinary 23%,
  shopping 21%) does not include fishing at any level, and the full Visitor Study
  is behind a marketing-partner login.

**Speaker note:** The licence table is the strongest slide in the deck for
proving the customer exists. Florida sells a 3-day and a 7-day non-resident
saltwater licence, which means the state itself has built a product for a
short-stay visiting angler. And the free shoreline-only licence is for
**residents** — a visitor fishing off the beach still buys one. So the visiting
shore angler is a distinct, identifiable, already-transacting segment. One thing
to refuse out loud if it comes up: FWC's own site also carries a "$9.2 billion"
saltwater recreational impact figure, but the page states it derives from
American Sportfishing Association / Southwick work based on **2011** survey data
inflated to 2020. It is not a primary measurement and this deck does not use it.
Saying that unprompted is worth more than the number would have been.

---

## Slide 6 — What the existing apps actually do — stated fairly

Every one of these is a good product. None of them is built for him.

| App | What it is genuinely good at | Price (US) |
|---|---|---|
| **Fishbrain** | The largest crowd-sourced catch database here; Garmin HD depth maps, bait/lure suggestions by species and area, regulations, private waypoints, fish identifier. Strong for seeing where fish are actually being caught. | App free; App Store lists Annual $79.99, Quarterly $41.99, Monthly $12.99 ([App Store](https://apps.apple.com/us/app/id477967747)) |
| **FishAngler** | The most shore-relevant map content of the six: access points, kayak access, fishing piers, marinas, buoys, artificial reefs — free with an account. 7-day marine forecasts, NOAA buoy data, 45-attribute logbook. | App free; VIP $6.99/mo, $49.99/yr ([App Store](https://apps.apple.com/us/app/id1073941118)) |
| **Fishing Points** | Waypoint marking done well; offline NOAA marine maps; seagrass, oyster bed and mangrove layers that genuinely matter in SW Florida; solunar and tide forecasts. | App free; App Store IAPs $9.99–$49.99, durations unlabeled ([App Store](https://apps.apple.com/us/app/id1203032512)) |
| **Navionics Boating** (Garmin) | Best-in-class marine cartography. SonarChart HD bathymetry, NOAA charts offline, routing. The category standard for anyone navigating a hull. | $49.99/year, US & Canada ([App Store](https://apps.apple.com/us/app/id744920098)) |
| **Tides Near Me** | One job, done cleanly and fast: nearby tide and current stations, rising or falling right now, tables and graphs, widgets, Watch complication. | App free; two "Premium" IAPs listed at $14.99 and $1.99, durations unlabeled ([App Store](https://apps.apple.com/us/app/id585223877)) |
| **Fish\|Hunt FL** (FWC) | The legal layer from the source of truth: buy and hold your Florida licence, regulations, boat ramps, tide stations, harvest reporting. Nothing else here can sell him the licence he legally needs. | Free, no in-app purchases ([App Store](https://apps.apple.com/us/app/id942550677)) |

**Speaker note:** Be generous here, deliberately. An unfair competitive slide gets
caught in the room, and this room can open any of these apps on a phone in ten
seconds. Two things to concede out loud before anyone raises them. **FishAngler
genuinely has shore access data** — piers, kayak access, access points, free —
so never say "none of them cover shore access". And **FWC does publish
fish-handling guidance**, including tarpon handling and venting diagrams, on its
website ([myfwc.com](https://myfwc.com/fishing/saltwater/recreational/)) — the
gap is in the app, not in the agency. Conceding both makes the two claims on the
next slide much harder to dismiss.

---

## Slide 7 — The gap, stated precisely enough to survive a challenge

Across all six apps, verified against each product's own site and store listing:

- **Zero provide a per-species rig, hook, leader, weight and bait recipe tied to
  a specific named spot.** Bait and lure *suggestions* are not the same as how to
  build the rig for this pass on this tide.
- **Zero provide in-app safe-handling and injury-avoidance guidance.**

And a structural point, not a slur: a map built from where people logged catches
inherits where people can *get to* — which is heavily boat-weighted water, while
**62 percent of saltwater trips are taken from shore** ([NOAA FEUS
2023](https://www.fisheries.noaa.gov/s3/2026-07/feus-2023-spo254a.pdf)). An app
covering every water in the country has no room for what matters on one
three-mile stretch. Local knowledge does not scale to fifty states, so it gets
replaced by a model output.

**Every competitor gives you a score. This one shows its work.**

**Speaker note:** The other half of the gap is a cold-start problem worth naming.
FishAngler's personalised game plans are built from the catches you have logged;
a twenty-year freshwater angler on his first salt trip has logged nothing in
salt water, so the personalisation has no history to work from on day one. That
is exactly the moment our reader needs the most help and exactly the moment a
crowd-sourced product has the least to give him. We are not better than these
apps at what they do. We are the only one that answers his six questions.

---

## Slide 8 — What Shorebound is

**25 researched spots**, St. Petersburg to Boca Grande Pass. **22 reachable on
foot** (`src/data/locations.ts`).

- **Tide stage per spot**, drawn against a live NOAA prediction for that spot's
  own station — all 25 (`src/lib/conditions.ts`, `README.md`)
- **104 per-species tackle recipes** — rig, hook, leader, weight, bait — across
  the 25 spots (`src/data/locations.ts`)
- **11 species with full pages**, **6 handle-with-care species**, **5 habitat
  types**, **6 rigs** (`src/data/fish.ts`, `hazards.ts`, `habitats.ts`, `rigs.ts`)
- **Photo species identifier** — returns an *estimate*, says so every time, is
  allowed to answer "I can't tell", flags anything unidentified as potentially
  hazardous, and links to the guide's own researched handling page rather than
  writing new advice (`README.md`)
- **20-business bait & tackle directory**, 18 independent, mapped to the spots
  each one serves (`src/data/shops.ts`)
- **Works fully offline.** The whole guide is bundled to the device
  (`README.md`, `vite.config.ts`)
- **Location never leaves the phone.** Distance ranking is arithmetic against
  bundled data; no request carries a coordinate (`src/lib/geo.ts`)

**Speaker note:** Offline is not a nice-to-have on this coast — the places worth
fishing are the places with one bar, and it is the feature that beats every
bigger app on the water. The privacy posture is unusual enough to be worth thirty
seconds: no analytics, no ad network, no tracking, photos never stored anywhere
(`src/pages/Privacy.tsx`). It is also a store-listing asset. What the product
deliberately does *not* have is a bite score or a catch prediction. There is no
catch data behind the app, so a likelihood number would be unfalsifiable, and the
whole appeal of the screen is that it shows its working.

---

## Slide 9 — The moat: researched content, not scraped or crowd-sourced

**The asset is the research, and research does not scale by crawling.**

Counted from the shipped data, not estimated (`src/data/locations.ts`):

| | |
|---|---|
| Spots | 25 |
| Reachable on foot | 22 |
| Seasons researched | 24 of 25 |
| Access notes | 25 of 25 |
| Safety notes | 21 of 25 |
| Sources attached | 25 of 25 |
| Source links, total | 53 |
| Dayparts | 22 of 25 |

Behind that: a formal review of **249 candidate items — 182 accepted, 12 held for
a phone call or a site visit, 55 rejected for having no checkable source**
(`docs/REVIEW_DECISIONS.md`, `src/admin/data/review-items.json`).

**Where nobody has researched something, the field is empty and the page says so.
Empty means "not done yet", never "nothing to say"** (`marketing/CONTENT_POLICY.md`).

**Speaker note:** Two reasons this is a moat rather than a cost centre. First, it
is not reproducible by scraping: half of it came from county park pages, FWC
boating guides, local newspapers and phone calls, and the reconciliation between
them is the actual work. Second, it is not reproducible by crowd-sourcing either,
because crowd-sourcing produces catch pins and this produces method. The 55
rejected items are the most important number on the slide — a competitor
optimising for coverage would have shipped all 55 and would look bigger than us
in a feature comparison and be wrong more often. That trade is the product.

---

## Slide 10 — Proof the moat is real: this coast changed and the databases did not

In 2024, Helene and Milton took this coast apart.

Annie's Bait & Tackle in Cortez was flooded, condemned and demolished. **Its
website is still live and still publishes opening hours.**

From a spot page in the guide, verbatim, appearing on four locations
(`src/data/locations.ts`):

> No easy bait stop on this stretch since Annie's in Cortez was demolished in
> 2025 — the nearest live bait is Bridge Street Bait Shop, or Island Discount
> Tackle four miles north. Buy before you drive out.

And from Fort De Soto (`src/data/locations.ts`):

> Both piers reopened in January 2025 after Hurricanes Helene and Milton. Some
> park facilities, including boat-ramp docks, were still under repair into 2026.

**A national database does not have any of this, because nobody drove out to
look.** The local part is a maintenance job, not a feature — which is a cost, and
it is also the reason the moat does not erode by itself.

**Speaker note:** This is the slide that converts sceptics, because it is
checkable in the room: open Annie's website on a phone. It also honestly names
the ongoing cost of the business — this content decays, and keeping it true is
permanent work. That cuts both ways in an investment conversation and it is
better to raise it than to be caught by it. The same maintenance burden is what
makes a bait shop willing to pay us: we are the only listing they have that is
checked rather than inherited.

---

## Slide 11 — The traffic thesis: the search phrase is a destination phrase

Live Google autocomplete, researched 22 Aug 2026 (`docs/NAMING.md`).

**"shore fishing guide"** completes to:

> shore fishing guide **near me** · shore fishing guide **kauai** · **maui** ·
> **aruba** · **grand cayman** · **oahu**

Every one of those is a **destination**, not a hometown. That is the product
thesis in an autocomplete list: **somebody in an unfamiliar place who wants to
fish and does not have a boat.**

Two consequences:

1. **`shore fishing guide <place>` is the phrase to own**, used verbatim in the
   store subtitle, the meta description and every per-place page title.
2. **It is the expansion path.** The same phrase works on every coast we add. The
   product is not "a Florida app" — it is a template that Florida is the first
   instance of.

Also found: `where to fish near` completes to **sarasota** — our own market.
And `how to fish a new area` returns **zero completions**: the idea is right,
those words are not how anyone asks. Never write copy around them.

**Speaker note:** Autocomplete shows relative demand and phrasing, not volume, and
say so before someone else does. The strategic read is that the destination
pattern means our reader is *already searching in our language* and finding
Hawaii and Aruba results, which means nobody is serving the query well anywhere.
The corollary is the constraint: this asset is currently unrealisable because the
app does not prerender, so the 25 sourced spot pages are not indexable. That is
named as the first thing after v1 in `docs/ROADMAP.md`, and it is also what makes
the content citable inside an AI answer, which is the second discovery channel.

---

## Slide 12 — Business model: three lines, deliberately sequenced

**Line 1 — Paid bait-and-tackle listings. The only revenue line in v1.**
A separate product from the subscription and from advertising. Sold to a real
business, invoiced directly. Built and working today: two tiers, and a paid
listing adds logo, tagline, standing offer with expiry, an attributed owner
quote, up to six photos, a website link, a call button, a map pin and directory
rank (`src/lib/listings.ts`, `src/components/ShopCard.tsx`, `src/admin/Shops.tsx`).
**Not subject to Apple's In-App Purchase rules** — it is advertising revenue, so
no store cut and no IAP on the critical path (`docs/ROADMAP.md`).

**Line 2 — Free tier with disclosed sponsored placements.** The frame is built:
`ads.enabled` is on for free and off for paid, ads render only through one
component, and that component has no prop that can suppress the "Sponsored"
label (`src/lib/entitlements.ts`, `src/components/AdSlot.tsx`).
**Deliberately not sold yet** — the roadmap's own rule is: do not sell inventory
in an app nobody has yet (`docs/ROADMAP.md`).

**Line 3 — Paid user tier.** A 13-capability free/paid matrix is built and
switched off, waiting (`src/lib/entitlements.ts`). Free gets 8 spots, 4 species,
2 photo IDs a day, live conditions and the whole safety section; paid gets all
25 spots, all 11 species, 7-day forecast, tide explorer, rig school, 20 IDs a
day and no ads. A thirteenth slot, the best-window planner, is declared in the
matrix but **not built** — the registry says so itself
(`src/lib/entitlements.ts`). **Explicitly excluded from v1** — it needs
StoreKit built and reviewed, and there are no users to sell it to
(`docs/ROADMAP.md`).

**Speaker note:** The sequencing is the argument, not the number of lines. Lines
2 and 3 are built and switched off on purpose, so nobody should hear this as
three revenue streams on day one — it is one, with two already-engineered
options behind it. Two rules are load-bearing and both are enforced in code
rather than promised: a shop can pay for prominence but never for presence, and
never to remove a competitor (`src/lib/listings.ts`); and the safe-handling
content can never be gated, enforced by a test (`src/test/entitlements.test.ts`).
The photo identifier is the one real variable cost — about $0.026 per
identification, rate-limited in Postgres before the paid call at 6/hour and
20/day per caller and 250/day globally, so worst case is about $6.50 a day
(`docs/COST.md`, `README.md`).

---

## Slide 13 — What is built today

- The guide: 25 spots, 11 species, 6 hazards, 6 rigs, 5 habitats, 104 tackle
  recipes (`src/data/`)
- Live NOAA tide predictions and NWS forecasts on all 25 spots, refreshed every
  3 hours via a Supabase Edge Function (`README.md`, `src/lib/conditions.ts`)
- Photo species identifier, 18 species across three honesty tiers, rate-limited
  server-side (`README.md`)
- Full offline PWA — the entire guide works with zero network (`README.md`)
- Bait & tackle directory, live to readers, plus a "Where to get bait" block
  showing the three nearest researched shops on every spot page
  (`src/pages/Shops.tsx`, `src/components/location/BaitNearby.tsx`)
- **New since the last narrative update:** user accounts with a sign-up gate —
  everything except the pitch page and the two legal pages now requires a free
  account — a user settings page, and an owner console with account management
  (`src/lib/auth.tsx`, `src/App.tsx`, `src/pages/Settings.tsx`, `src/admin/Users.tsx`)
- Privacy policy and support pages, reachable in-app as the App Store requires
  (`src/pages/Privacy.tsx`, `src/pages/Support.tsx`)
- Owner console: entitlement matrix, shop listings, ad campaigns, review queue,
  accounts (`src/admin/`)
- **309 tests passing**, 15 files (`npm test`, 23 Aug 2026). No WCAG 2.1 A/AA
  violations across every route, light and dark, mobile and desktop (`README.md`)

**And what is not:** no users, no revenue, no store listing. The landing page
says so itself — the two store buttons are labelled placeholders
(`src/pages/Welcome.tsx`).

**Speaker note:** Say the last line without softening it. The honest framing is
that the hard, slow, unglamorous half is done — the researched content, the
offline architecture, the entitlement and listing machinery, the accounts, the
legal pages — and what remains is packaging and distribution work with known
steps. Note that `docs/ROADMAP.md` still records 278 tests and lists the shop
directory as not yet visible to readers; both have since been overtaken by the
code, which is the direction you want that discrepancy to run.

---

## Slide 14 — What is next, and what is deliberately excluded

**v1 ships when six things are done** (`docs/ROADMAP.md`):

1. Name, domain, email — Shorebound is chosen and `support@shorebound.app` is
   live (`src/data/contact.ts`); domains still to buy
2. Privacy and support pages — **done**
3. Shop directory visible to readers — **done**
4. Store packaging: icons, screenshots, listing copy, age rating, category
5. The wrappers: Google Play via Trusted Web Activity first, then the App Store
   — budget for at least one rejection under guideline 4.2
6. The twelve held review items — each is one phone call or one page re-read

**Then, in order:** SEO prerendering and per-page titles; the 7-day forecast;
the "when to fish" window planner; the remaining season research; the paid tier;
expansion north and south at the same research standard.

**Explicitly NOT in v1, and not for sale here:** the window planner, the 7-day
forecast UI, AI-written explanations, the paid user tier and IAP, non-shop
advertising, SEO prerendering, more spots, location photography.

**Speaker note:** The exclusion list is the most useful slide in the deck for
judging whether this is a real business. It exists because the project was adding
capability faster than it was shipping, and the roadmap's stated purpose is "to
say no". The window planner is held back precisely because it is the strongest
premium feature on the roadmap — it deserves a launch, not a footnote in one. If
someone in the room wants to fund the planner, that is a conversation, but it
does not get sold before it exists.

---

## Slide 15 — What would kill this, said out loud

- **Distribution.** Content quality does not distribute itself. Until
  prerendering ships, 25 sourced pages are invisible to search
  (`docs/ROADMAP.md`).
- **App Store guideline 4.2.** A PWA wrapper can be rejected as a repackaged
  website. The case is real — bundled offline content, camera-based species
  identification, geolocation ranking, live NOAA and NWS data — but it has to be
  made, and one rejection should be budgeted (`docs/ROADMAP.md`).
- **The maintenance cost is permanent.** Piers close, shops shut, passes move.
  The moat is only a moat while someone keeps driving out to look.
- **Coverage looks small next to a national app.** 25 researched spots will lose
  a feature-count comparison to 25,000 crowd-sourced pins, and that is a sales
  problem we have chosen on purpose.
- **A name is not a trademark.** `Shorebound` is clear on Google Play for
  fishing; an unrelated app holds it on the App Store, and registry availability
  is not clearance (`docs/NAMING.md`).

**Speaker note:** Naming the limits is the most persuasive thing available and it
costs nothing but discipline — it is a rule in the narrative document and it
applies in a pitch room more than anywhere. Each of these has a named response
rather than a shrug: prerendering is scoped and is the first item after v1; the
4.2 case is written; maintenance is what the shop relationships fund; the
coverage argument is answered by the 55 rejected review items; and the trademark
step is a USPTO plus Florida state search before the domain purchase.

---

## Slide 16 — The ask

**What we are asking for, and what it buys:**

- Getting v1 to both stores: packaging, the two wrappers, and one budgeted
  App Store rejection
- SEO prerendering and per-place pages, so the 25 sourced spots become
  `shore fishing guide <place>` — the phrase the research says people type
- Research capacity to close the remaining gaps — safety notes on 4 spots,
  seasons on 1, dayparts on 3, and the 12 held review items — then expansion
  north and south at the same standard
- Sales capacity for the first bait-shop listings, which is the only revenue
  line in v1

**The measure of success for v1, from the roadmap, unchanged:** on Google Play
and the App Store, **and the first bait shop paying for a listing.** Nothing else
counts as done (`docs/ROADMAP.md`).

**Speaker note:** Leave the number blank on the slide until the owner sets it —
inventing a raise figure in a deck whose entire premise is not inventing figures
would be the wrong note to end on. What to say instead is the shape: this is not
a bet on whether the product works, because it is built and tested and can be
opened on a phone right now. It is a bet on whether researched local content can
be distributed profitably against crowd-sourced national coverage — and the
answer to that is knowable within one season, on one coast, for a small amount of
money.

---

*Every product claim in this deck names the repository file it is checkable in.
Every market claim names a source URL. Where no credible figure was found, this
document says so.*
