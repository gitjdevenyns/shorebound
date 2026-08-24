# Shorebound — a listing in the bait & tackle directory

**For the owner of a bait, tackle or marina business between St. Petersburg and
Boca Grande Pass.**

Straight answer first, because you are busy: **you are already in the directory,
you did not pay to be there, and you cannot be removed from it by a competitor
paying us.** This is a proposal about how your entry looks, not about whether it
exists.

---

# Page one — why your customers are looking at this

## Who is holding the phone

A man who has fished freshwater for twenty years and has never fished salt water.
He can read a lake at a glance and none of it transfers here. He does not want to
book a charter — he wants to work it out himself. What he is missing is local
knowledge, and the two things he is missing most are **where to stand** and
**what to put on the hook.**

The second one is your business.

There are a lot of him. Florida had **143.3 million visitors in 2025**, a record
([VISIT FLORIDA, 20 February 2026](https://www.visitflorida.org/about-us/media/news-releases/article-details/?releaseId=21303)),
and NOAA's 2023 economic report says of recreational saltwater fishing that
"West Florida was the largest contributor by far"
([NOAA Fisheries](https://www.fisheries.noaa.gov/national/sustainable-fisheries/fisheries-economics-united-states)).
Note also that Florida's no-cost shoreline-only licence is for **residents** — a
visitor fishing off the beach buys a licence, at $17 for three days or $30 for
seven ([FWC](https://myfwc.com/license/recreational/saltwater-fishing/)). He is
already spending money before he reaches your counter.

**What we cannot tell you is how many of those visitors fish.** No credible
figure was found for that — VISIT FLORIDA's activity data sits behind a partner
login — so we are not going to put a number on it.

## What the app is

A shore-fishing guide for this coast. Twenty-five researched spots, St.
Petersburg to Boca Grande Pass, twenty-two of them reachable on foot
(`src/data/locations.ts`). For each spot: the tide stage it actually fishes, the
structure you are standing over, the species it holds, and the rig, hook, leader,
weight and bait for each of those species — 104 of those recipes across the
twenty-five spots (`src/data/locations.ts`).

Live NOAA tide predictions and NWS forecasts on all twenty-five
(`src/lib/conditions.ts`, `README.md`). The whole guide works with no signal —
it is downloaded to the phone (`README.md`, `vite.config.ts`).

Every one of those tackle recipes ends in something a person has to buy before
sunrise. That is the whole reason a bait shop belongs in this app rather than in
a general directory.

## Where your shop already appears

**Twenty businesses are in the researched directory today, eighteen of them
independent** (`src/data/shops.ts`). Each is mapped to the spots it is a
practical bait stop for, and **every one of the twenty-five spots has at least
one shop attached** (`src/data/shops.ts`, field `serves`).

Two places a reader sees you:

1. **The bait & tackle page** (`src/pages/Shops.tsx`) — the full directory,
   filterable, sorted by how far you are from the reader when they have shared
   their position.
2. **On the spot page itself** — a "Where to get bait" block on each location,
   showing the three nearest researched shops for that spot
   (`src/components/location/BaitNearby.tsx`). This is the one that matters: it
   appears next to the rig the reader has just decided to fish, at the moment he
   is working out where to buy the bait for it.

Your free entry carries your name, address, kinds of business, what you carry,
your hours, distance from the reader, a tap-to-call number and a Directions link
(`src/components/ShopCard.tsx`).

## What paying adds

A paid listing is called **enhanced**. It adds your own material on top of the
free entry. Here is the complete list, from the code that defines it
(`src/lib/listings.ts`) and the code that draws it (`src/components/ShopCard.tsx`):

| | Free (basic) | Paid (enhanced) |
|---|---|---|
| Name, address, kinds, what you carry, hours | Yes | Yes |
| Tap-to-call number, Directions | Yes | Yes |
| Distance from the reader | Yes | Yes |
| Your logo | — | Yes |
| A one-line tagline under your name | — | Yes |
| A standing offer, with an expiry date | — | Yes |
| A quote from you, attributed to you | — | Yes |
| Photos of the shop (up to six) | — | Yes |
| An outbound link to your website | — | Yes |
| A prominent call button rather than plain text | — | Yes |
| A distinct pin on the map instead of a plain dot | — | Yes |
| Sort weight in the directory | Editorial order | Floats up |
| Sponsor card on named location pages | — | Yes |

## What paying does not buy, ever

- **It does not put you in the directory.** Inclusion is editorial and is decided
  before money is discussed. The two decisions live in separate fields and are
  managed on separate controls (`src/lib/listings.ts`, `src/admin/Shops.tsx`).
- **It does not remove a competitor**, hide one, or push one out of the listing.
- **It does not change a researched fact** about your shop or anybody else's.
  Address, phone and stock come from the research file and can only change
  through the review queue (`src/admin/Shops.tsx`).
- **It is not invisible.** Every enhanced listing carries a "Sponsored" label,
  and there is no way to switch that off — the component has no prop for it
  (`src/components/ShopCard.tsx`, `src/lib/listings.ts`).

That last one is not modesty. A directory that lists only advertisers has no
readers, and a listing nobody reads is worth nothing to you. The label is what
keeps the rest of the directory worth opening.

---

# Page two — the proof, and the price

## How a spot gets into this guide

Not scraped, and not crowd-sourced. Researched from named sources, and the
sources ship on the page where the reader can click them.

Twenty-five spots carry **53 source links between them** (`src/data/locations.ts`).
Field coverage today, counted from the file rather than estimated: seasons on 24
of 25 spots, access notes on 25 of 25, safety notes on 21 of 25, sources on 25 of
25 (`src/data/locations.ts`).

Where nobody has researched something, the field is empty and the page says so.
Empty means "not done yet", never "nothing to say"
(`marketing/CONTENT_POLICY.md`, `src/data/locations.ts`).

The research went through a formal review: **249 candidate items, 182 accepted,
12 held for a phone call or a site visit, 55 rejected for having no checkable
source** (`docs/REVIEW_DECISIONS.md`, `src/admin/data/review-items.json`).

## How the shop entries were done — held to a stricter rule than the rest

From the top of the shop data file, verbatim (`src/data/shops.ts`):

> These are real businesses. A plausible-but-wrong address, phone number or
> opening time sends someone across the county to a closed door. Nothing in this
> file was written from general knowledge: every entry traces to `docs/research/`,
> and any field that could not be verified is `null` or empty rather than
> guessed.

Every shop carries a **verification** state. Today: **9 verified first-party, 11
marked `needs_check`** (`src/data/shops.ts`). A shop we could not confirm is not
quietly published with plausible hours — it is flagged, and it stays out of the
reader's view until somebody has made the call (`src/admin/Shops.tsx`).

If your hours are wrong in there, that is a five-minute fix and we would rather
have the call than the listing fee.

The reason this matters to you specifically: after Helene and Milton, this coast
is full of businesses that no longer exist and websites that still publish
opening hours. Annie's Bait & Tackle in Cortez was demolished in 2025. The
guide's own access note on four spot pages reads, verbatim
(`src/data/locations.ts`):

> No easy bait stop on this stretch since Annie's in Cortez was demolished in
> 2025 — the nearest live bait is Bridge Street Bait Shop, or Island Discount
> Tackle four miles north. Buy before you drive out.

That sentence sends someone to a shop that is open. A national database does not
have it, because nobody drove out to look.

## What your listing actually looks like

Take a real free entry as it ships today (`src/data/shops.ts`):

> **Bridge Street Bait Shop** · 200 Bridge Street, Building A, Bradenton Beach,
> FL 34217 · bait · tackle
> Carries: live shrimp · frozen shrimp · squid · sand fleas · pinfish (sometimes)
> Hours: 7 days, 7:00am–8:00pm
> Rod rental available.
> [941-330-0650] [Directions]

Named as the bait stop on **seven** spot pages (`src/data/shops.ts`).

An enhanced version of the same card adds, in this order: the Sponsored label at
the top, your logo beside your name, your tagline under it, your offer line, your
quote with your name on it, your photos, and a Website button next to the phone
number (`src/components/ShopCard.tsx`).

**What we need from you to build it:** a logo file, up to six photos of the shop
(the inside of a real shop sells better than a stock photo), one line of tagline,
one standing offer and the date it ends, and one or two sentences from you with
your name and how long you have been there. We do not write the quote or invent
the offer — it is your material, presented as yours (`src/lib/listings.ts`).

An offer with an expiry date stops showing itself the day it expires, with no
call to us needed (`src/lib/listings.ts`, field `offer_expires`).

## The honest state of the business

**There are no users yet.** This is pre-launch. The app is not on the App Store
or Google Play — neither listing exists (`docs/ROADMAP.md`,
`src/pages/Welcome.tsx`). We will not quote you a reach number, because there
isn't one, and a made-up one would be the fastest way to lose the thing this
whole product is built on.

What we can tell you is what is built and working: the guide, the directory, the
per-spot bait block, and the machinery that turns your listing on
(`src/admin/Shops.tsx`). An early listing is priced as an early listing, and the
terms below reflect that.

## Price

> ## [PRICING — OWNER TO SET]
>
> **No price is defined anywhere in this repository.** There is no price field in
> the listing data model (`src/lib/listings.ts`), no rate card in `docs/`, and no
> figure in the roadmap. It has deliberately not been invented here.
>
> The owner needs to set, before this document goes to a shop:
>
> - the price of an enhanced listing, and its billing period
> - the term (month to month, or a season)
> - whether there is a founding / pre-launch rate, and what happens to it at launch
> - what a "sponsor card on a location page" costs, if it is priced separately
>   from the directory listing (the code treats it as a separate placement —
>   `src/lib/listings.ts`, `placements.location_slugs`)
> - the refund position if the app does not launch
>
> Note from `docs/ROADMAP.md`: shop listings are invoiced directly and are **not**
> subject to Apple's In-App Purchase rules, so there is no store cut to price
> around.

---

**To take a listing, or to correct anything above about your shop:** contact the
owner directly. Corrections are free and always will be.

*Every factual claim in this document is checkable in the file named beside it.*
