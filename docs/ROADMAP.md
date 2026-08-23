# Roadmap — v1 to the stores

**The point of this document is to say no.** The project has been adding
capability faster than it has been shipping, and every item below the line is
a good idea that will make v1 later. Scope is frozen at the list in "v1 ships
when". Anything else is v1.1 or later, no matter how good it is.

Changing v1 scope is allowed — but it is a decision, made deliberately, and
written down here. It is not something that happens because a build session
went somewhere interesting.

---

## The goal

**Gulf Coast Fishing Guide on Google Play and the App Store, and the first
bait shop paying for a listing.**

Nothing else counts as done.

---

## Where we actually are

Verified 22 Aug 2026.

| | |
|---|---|
| Spots | 25, St. Petersburg → Boca Grande Pass |
| Documented species | 11, plus 6 handle-with-care |
| Live data | NOAA tide + NWS forecast on **all 25** spots |
| Content coverage | seasons 24/25 · access 25/25 · safety 21/25 · sources 25/25 |
| Shop directory | 20 researched businesses, 18 independent |
| Tests | 278 passing |
| Deployed | https://gitjdevenyns.github.io/GCF/ |

The guide itself is essentially built. What is missing is everything between a
working web app and a listed product.

---

## v1 ships when

Six things. Nothing on this list is optional and nothing else is on it.

### 1. Name, domain, email
Blocks the store listing, the privacy policy URL, the support URL and every
piece of marketing.

**Email is decided (23 Aug 2026): a custom domain added to the existing
Microsoft 365 subscription.** Included in what is already paid for, so no
incremental cost. Deliverability matters more than usual here — the first
revenue line is cold-approaching bait shops, so SPF, DKIM and DMARC need to be
right or the pitch lands in spam and it reads as a sales problem rather than a
DNS one. **Recommendation: Read the Water** (`readthewater.app`
free; the `.com` is a parked lander worth a broker quote). Renaming touches
`vite.config.ts`, the router, the service worker precache and `dist/404.html`
— one careful pass, not a find-and-replace.

### 2. Privacy policy and support pages
**A hard App Store requirement, and neither exists.** Guideline 5.1.1(i): a
privacy policy must be linked in App Store Connect *and* reachable inside the
app. Guideline 1.5 requires a working support contact.

This app has an unusually good story to tell here and currently tells it
nowhere: location never leaves the device, photos are never stored, no
accounts, no third-party ad network, no tracking.

### 3. The shop directory, visible to readers
Twenty researched shops exist in the data and **no reader can see one**.
Nothing imports `SHOPS` except the tests and the admin console, and
`shopsServing()` is called by nothing.

Needed: a `/shops` page, a "where to get bait" block on each location page,
and the enhanced-listing treatment rendering (logo, photos, owner statement,
offer) so a paid listing can be demonstrated to the shop being sold it.

### 4. Store packaging
Icons at every required size, screenshots per device class, listing copy, age
rating, category. `marketing/NARRATIVE.md` is the source for the description.

### 5. The wrappers
**Google Play** takes a PWA through a Trusted Web Activity with little
friction — do this one first and learn on it.

**The App Store is the harder one.** Guideline 4.2 requires an app to be more
than "a repackaged website", and 4.2.2 rules out apps that are primarily web
clippings. This app has a real case — bundled offline content, camera-based
species identification, geolocation ranking, live NOAA and NWS data — but the
case has to be *made*, and a thin wrapper will be rejected. Budget for at
least one rejection and a resubmission.

### 6. The twelve held review items
Each needs one phone call or one page re-read. They are listed in
`docs/REVIEW_DECISIONS.md`. Two matter more than the rest: the Palma Sola
catch-and-release **regulation** (FWC), and Bean Point's paid parking after
the 31 August meeting.

---

## Monetisation: the part that changes the plan

**Shop listings are not subject to In-App Purchase.** Apple's 3.1.1 governs
digital goods sold to app users. Selling a bait shop a placement, invoiced
directly, is advertising revenue and sits entirely outside it — no 15–30% cut,
no IAP integration, no added review complexity.

**A paid user tier is subject to it**, and would need StoreKit built,
reviewed, and priced around Apple's cut. Worth knowing for later: on the **US
storefront** apps may now include external purchase links, which changes the
maths — but that is a v1.1 problem, and this is a US-storefront audience.

**So v1 ships free, with the shop directory as the only revenue line.** That
removes IAP from the critical path entirely and gets the product in front of
people months earlier. The free/paid capability matrix already built stays
where it is, switched off, waiting.

---

## Explicitly NOT in v1

Every one of these is a good idea. None of them ships first.

- **"When to fish" window planner** — the strongest premium feature on the
  roadmap, and the reason to hold it is that it is the strongest: it deserves
  a launch, not a footnote in one.
- **7-day forecast UI** — the data is already in the browser, which makes this
  tempting and cheap. It is still not what stands between here and a listing.
- **AI-written explanations** — needs seasons and dayparts finished first, and
  needs caching designed. Phase 3.
- **Paid user tier, IAP, billing** — see above.
- **Selling non-shop advertising** — the frame is built. Do not sell inventory
  in an app nobody has yet.
- **SEO prerendering** — real, and blocking `tide chart bradenton`, the
  highest-intent keyword found. It is a *web growth* problem, not a *store
  launch* problem. First thing after v1.
- **More spots** — 25 researched beats 40 guessed, and the content rule makes
  more spots a research project, not a build one.
- **Photos of locations** — none are licensable and satellite already works.
- **Admin polish** — it works, and it has one user.

---

## After v1, in order

1. SEO: real routes, per-page titles, canonical tags, sitemap, prerendering
2. The 7-day forecast, then the window planner
3. Research the remaining season and daypart gaps
4. Paid tier, once there are users to sell one to
5. Expansion north and south, at the same research standard

---

## Working rules

- **A capability not on the v1 list does not get built**, however small it
  looks and however close to hand the data is.
- **Every session ends green**: `npm run build` clean, `npm test` passing.
- **Never invent fishing content.** Unresearched stays empty.
- **The owner decides scope changes**, and they get written down here.
