# Review decisions — first pass

Made by Claude on 2026-08-22, on the owner's instruction to take a first cut
rather than hand him 249 items. **Every one of these is a default, not a
verdict** — overturn anything in the owner console and it sticks.

| Outcome | Count |
|---|---|
| Accepted | 182 |
| Needs info | 12 |
| Skipped | 55 |
| Left pending | 0 |
| **Total** | **249** |

## The rules used on the bulk

1. **skipped** — Superseded — the researched shop now lives in src/data/shops.ts and is managed in the Bait & tackle tab, where it has an include toggle and a listing tier. Keeping a duplicate here would mean two places to change one fact.
2. **skipped** — No checkable source. The guide's rule is that an unresearched field stays empty — empty means "not done yet", and that is a more useful thing to show a reader than a plausible sentence nobody verified.
3. **accepted** — A citation attached to a spot. Pure upside: it makes an existing claim checkable and adds nothing new to verify.
4. **needs_info** — A secondary source on a claim that goes stale — hours, fees, construction. Not wrong, but not something to put in front of a reader without a call or a look.
5. **accepted** — Official or first-party source, quoted. This is the bar the guide already holds its existing content to.
6. **accepted** — A credible secondary source with nothing official contradicting it, on a claim that does not go stale.

## The twenty corrections, decided one at a time

These say the guide is currently wrong about a real place, so a rule is the
wrong instrument. Each was read and decided individually.

### ACCEPTED · Emerson Point / Snead Island

> Emerson Point Preserve Dock closed until further notice / Due to hurricane damage, the Emerson Point Preserve Dock will remain closed until further notice.

**Why:** The county says the dock is closed until further notice and the guide sends people there for shore and kayak access. This is the single most important item in the queue.

### ACCEPTED · Green Bridge

> The public fishing pier is the surviving span of the 1927 bridge on the north (Palmetto) bank, in Riverside Park at Riverside Dr & 9th Ave W — roughly 27.514, -82.574. `locations.ts` currently has lat: 27.5003, lng: -82.5705, which is the south (Bradenton) ban…

**Why:** The coordinates in locations.ts point at the wrong bank. The pier is the surviving 1927 span on the Palmetto side. A wrong pin sends someone to the opposite shore of a river.

### ACCEPTED · Bridge Street / Bradenton Beach

> Hurricane repairs to decking, pilings, handrails and floating docks under an agreement running to 30 September 2026; the floating dock section is still closed for Milton repairs (second amendment approved 19 Mar 2026, $375k cap) — the rest of the pier reopened…

**Why:** Part of the pier is still closed and the guide types this spot as pier access. Sourced to the county funding agreement.

### ACCEPTED · Coquina Beach

> Manatee County has approved $6.18 million of TDT funding for beach renourishment. Construction is currently scheduled for November 2026 through March/April 2027, covering shoreline areas at Cortez Beach and Coquina Beach. Expect dredge pipe, heavy equipment an…

**Why:** Renourishment starts within months of now and runs through the season. Official, funded, dated.

### NEEDS_INFO · Bean Point

> City of Anna Maria Parking Study — a public meeting was set for 31 August 2026. The study proposes designating 1,119 paid parking spaces at a suggested $4.50-per-hour rate, with a launch proposed "in March". Nothing is adopted.

**Why:** A parking study, not an enacted rate. Publishing $4.50/hour before the vote would be stating a proposal as fact. Re-check after the 31 Aug 2026 meeting.

### ACCEPTED · Cortez Bridge

> FDOT's replacement project entered construction in September 2026, a 1,200-day job, with barges and temporary trestles working in the channel either side of the span and the existing 1956 drawbridge scheduled for demolition from mid-2028. The bridge stays open…

**Why:** A 1,200-day FDOT construction project in the channel either side of the span. The guide describes fishing the pilings; that description is now questionable for years.

### ACCEPTED · Stump Pass

> Hurricane Milton cut a new pass through the peninsula along the Nature Trail. The former 1.3-mile walk to the tip no longer exists as one continuous beach. Any content describing that walk is now wrong.

**Why:** Milton cut a new pass through the trail. The guide implies a walk to the tip that no longer exists as one beach. Medium confidence, but the change is physical and well attested.

### NEEDS_INFO · Englewood Beach

> Charlotte County's fishing page lists only Centennial Fishing Pier as open, and notes multiple piers were hurricane-damaged with 12–24 month permitting before repairs even begin. Verify the Englewood Beach pier specifically before any note promises it.

**Why:** The research itself says verify. County pier status after the storms is exactly the kind of claim that must not be guessed.

### NEEDS_INFO · Lemon Bay Mangroves

> Lemon Bay Park and Environmental Center was reported still closed from Hurricane Helene damage as of March 2025. Sarasota County's own pages returned HTTP 403 and could not be checked — 2026 status is unknown.

**Why:** Last reported closed in March 2025 and the county sites 403 to automated checks. "Probably still closed eighteen months later" is not something to publish.

### ACCEPTED · Placida / Gasparilla Sound

> Placida West Boat Ramp Expansion — construction scheduled 24 Feb 2027 to 19 May 2028. Scope: 2-lane boat ramp, kayak launch, additional parking for both vehicles and boat trailers, asphalt ADA parking, and a restroom facility; master plan reaches 6 launch lane…

**Why:** Dated, funded, scoped public works with a defined window. Useful for anyone planning ahead.

### ACCEPTED · Emerson Point / Snead Island

> I'm avoiding areas in the mouth of the Manatee River due to the lack of seagrasses, especially along the northern shoreline from Emerson Point eastward to the Pilsbury docks.

**Why:** Published first-person observation from a named local columnist about seagrass loss. Accepted as an attributed quote, never as the guide's own claim about the water.

### NEEDS_INFO · Palma Sola Bay

> Sarasota Bay, Palma Sola Bay and all waters south of Manatee Avenue remain catch-and-release only.

**Why:** This is a fishing REGULATION. The rule dates to 2021 and the research says re-check it against FWC. The guide states plainly that regulations are verified before being presented as legal guidance — getting this wrong could cost a reader a citation.

### SKIPPED · South Palma Sola Flats

> People can be seen wading and fishing in the waters of Palma Sola Bay on the south side of the Palma Sola Causeway.

**Why:** "People can be seen wading here" is an observation from a source document, not usable guide content. It tells a reader nothing they cannot see for themselves.

### SKIPPED · Annie's Bait & Tackle

> Annie's Bait & Tackle, 4334 127th St W, Cortez, was demolished 16 April 2025 (flooded by Helene, windows blown by Milton; commissioners voted 6-1 to demolish; owner Bruce Shearer offered to pay for repairs and was refused). Its website, anniesbaitandtackle.com…

**Why:** Handled in the directory instead: Annie's is correctly absent from src/data/shops.ts and the live-site trap is recorded in the research file. Nothing to add to a location page.

### SKIPPED · The Seafood Shack Marina, Bar & Grill

> The Seafood Shack Marina, Bar & Grill, 4110 127th St W, Cortez — demolition began 21 Apr 2025. Manatee County bought the site ($13M) for a county-owned "Cortez Marina" (public ramp, dry storage). Not built yet.

**Why:** Shop data, already handled by its absence from the directory.

### SKIPPED · Anna Maria City Pier

> Anna Maria City Pier is CLOSED, under reconstruction. 400–500 ft of walkway destroyed by Helene/Milton. Targeting November 2026. A bait & tackle shop is in the rebuild plan but does not exist yet.

**Why:** Anna Maria City Pier is not one of the guide's 25 spots, so nothing in the app is currently wrong about it. Worth revisiting if it is added after the late-2026 reopening.

### SKIPPED · Rod & Reel Pier

> Rod & Reel Pier is DESTROYED; only the entrance sign and pilings remain. Rebuilding on land, not over water. GoFundMe at $104,431 of $300,000 as of 26 May 2026.

**Why:** Not a spot in the guide. Same reasoning as the City Pier.

### ACCEPTED · Cortez / Bradenton Beach bait cluster

> There is no replacement for Annie's. For the Cortez Bridge / Longboat Pass / Bradenton Beach cluster the live-bait options are now Bridge Street Bait Shop (the only one with a first-party live-bait list), Cortez Bait & Seafood (live shrimp credible but unconfi…

**Why:** The strongest piece of practical content in the whole queue: since Annie's went, this cluster has no easy bait stop. That is precisely the "buy bait before you drive in" note Weedon Island already carries, and it applies to the Cortez, Bridge Street, Longboat Pass and Coquina spots.

### SKIPPED · Mastry's Bait & Tackle

> Mastry's Bait & Tackle, 1700 4th St S, St. Petersburg — the space is now McMullen Fish House, a retail seafood market that sells no bait. Local news (4 Mar 2024) calls Mastry's "the shuttered St. Pete staple"; Yelp title reads "CLOSED — Updated June 2026". Wid…

**Why:** Shop data, handled by absence from the directory.

### SKIPPED · Bait Bucket / Tierra Verde Bait & Tackle

> Bait Bucket / Tierra Verde Bait & Tackle, 108 Pinellas Bayway S — Yelp title "CLOSED — Updated June 2026"; closed for redevelopment of the Tierra Verde entrance plaza. Two caveats: OSM still carries a node (OSM lags closures, not evidence of open), and marinaw…

**Why:** Unsourced and shop data. The closure needs a phone call, which is recorded in the research file.


## What still needs you

- **Emerson Point / Snead Island** — A secondary source on a claim that goes stale — hours, fees, construction. Not wrong, but not something to put in front of a reader without a call or a look.
- **Green Bridge** — A secondary source on a claim that goes stale — hours, fees, construction. Not wrong, but not something to put in front of a reader without a call or a look.
- **Bean Point** — A parking study, not an enacted rate. Publishing $4.50/hour before the vote would be stating a proposal as fact. Re-check after the 31 Aug 2026 meeting.
- **Stump Pass** — A secondary source on a claim that goes stale — hours, fees, construction. Not wrong, but not something to put in front of a reader without a call or a look.
- **Stump Pass** — A secondary source on a claim that goes stale — hours, fees, construction. Not wrong, but not something to put in front of a reader without a call or a look.
- **Stump Pass** — A secondary source on a claim that goes stale — hours, fees, construction. Not wrong, but not something to put in front of a reader without a call or a look.
- **Stump Pass** — A secondary source on a claim that goes stale — hours, fees, construction. Not wrong, but not something to put in front of a reader without a call or a look.
- **Englewood Beach** — The research itself says verify. County pier status after the storms is exactly the kind of claim that must not be guessed.
- **Lemon Bay Mangroves** — A secondary source on a claim that goes stale — hours, fees, construction. Not wrong, but not something to put in front of a reader without a call or a look.
- **Lemon Bay Mangroves** — Last reported closed in March 2025 and the county sites 403 to automated checks. "Probably still closed eighteen months later" is not something to publish.
- **Boca Grande Pass** — A secondary source on a claim that goes stale — hours, fees, construction. Not wrong, but not something to put in front of a reader without a call or a look.
- **Palma Sola Bay** — This is a fishing REGULATION. The rule dates to 2021 and the research says re-check it against FWC. The guide states plainly that regulations are verified before being presented as legal guidance — getting this wrong could cost a reader a citation.
