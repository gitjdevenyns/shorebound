# Map vendor options — August 2026

Commissioned by: architect, in response to "our map looks old and dated is
there nothing better?" Scope: `src/components/MapView.tsx`, Leaflet 1.9.4,
raster OSM street tiles + Esri World Imagery satellite, no API key on either.

Two problems, one fix window: `docs/review/security-privacy-review.md`
already flagged both tile sources as licensing risk requiring a lawyer before
store submission (OSMF Tile Usage Policy targets low-volume/OSM-related use,
not a commercial ad-supported app; Esri's basemap terms generally require a
subscription for third-party application use). This memo treats "looks
dated" and "may not be licensed" as the same ticket.

Stage, per `docs/ROADMAP.md`: pre-launch, zero users, not on any store yet.
v1's only revenue line is paid bait-shop listings — no scale to size this
against yet. No prior vendor decision exists to relitigate; the choice below
is being made for the first time.

---

## Direct answer: is this fixable without changing vendor at all?

**Partially, and worth knowing before the real fix.** Three sub-questions:

- **Retina `@2x` raster tiles from OSM directly?** No. `tile.openstreetmap.org`
  serves only standard-DPI 256px PNGs; there is no official retina endpoint.
  Soft-on-hi-DPI is structural to that source, not a config flag.
- **A different, nicer-looking OSM-*data*-based raster style, no vendor
  contract?** Yes, partway. CARTO's Positron/Voyager basemaps are built on
  OSM data, offer hi-DPI `@2x` raster tiles, and are free up to 5M tile
  requests/month with no commercial disclosure required up front (see CARTO
  row below). Swapping the street `L.tileLayer` URL to a CARTO style is a
  one-line change, fixes the soft-hi-DPI complaint, and is cleaner licensing
  than the status quo. It does **not** fix brand theming, dark mode, or label
  control — those need vector rendering, not a nicer raster.
- **Vector styling without leaving Leaflet?** No, not really. Leaflet is a
  raster-tile-plus-markers library; vector rendering with GPU styling,
  rotation, and data-driven theming is MapLibre GL JS's job, not Leaflet's.
  Leaflet has PMTiles plugins but they're second-class compared to
  MapLibre's native support. **Fixing the actual "dated" complaint (crisp at
  any zoom, brand-matched colors, dark mode) requires moving the renderer to
  MapLibre GL JS.** That is a rendering-library change, not a data-vendor
  change, and it's compatible with every option below.

So: the CARTO raster swap is a legitimate 15-minute stopgap that measurably
improves the complaint and improves the licensing position, but it is a
stopgap. The recommendation below is the real fix.

---

## Recommendation for this stage: self-hosted PMTiles (Protomaps vector street
+ NAIP raster satellite), rendered with MapLibre GL JS

**Cost: $0/month at any usage level, today or at scale.** No API key, no
account, no card, no rate limit, no per-request billing — because there is no
vendor in the request path. The basemap ships as a static file from the same
Cloudflare deployment already serving the app.

**Why this fits the three weighted constraints better than any hosted vendor:**

1. **Offline-first is the product's first hard constraint, and today's map
   fails it exactly like a hosted vendor would** — raster tiles from
   `tile.openstreetmap.org` and `arcgisonline.com` are both live HTTP fetches
   with no offline path. A PMTiles file is a single static asset the service
   worker can precache like everything else in `src/data/`; the map keeps
   working with no connection, which is not true of *any* hosted option in
   this memo. This isn't a nice-to-have here — it's the one hard constraint
   the current map doesn't meet.
2. **Location never leaves the device — verified, and this is the strongest
   version of that guarantee.** Traced `MapView`'s three call sites: `Home.tsx:495`
   centers on `[pick.lat, pick.lng]`, one of the 25 published spot
   coordinates (`pick` is the nearest *ranked spot*, not the user's own
   position); `LocationDetail` and `Shops` never pass user coordinates to the
   map at all. **The map has never been centered on the user's actual GPS
   position and should stay that way regardless of vendor** — that fact is
   what makes any hosted vendor's tile requests reveal "viewing spot #N" (one
   of 25 public locations) rather than the user's location. A self-hosted
   static file makes this moot rather than merely safe: there's no second
   party to reveal anything to, full stop. Keep the "never wire `geo.coords`
   into map center" rule written down wherever this ships, since it's what
   currently makes every option in this memo compliant with the constraint —
   not just this one.
3. **v1 revenue is bait-shop listings only, zero users.** A hosted vendor's
   free tier is attractive *because* it's free at zero volume — but every one
   of them requires a decision (signup, sometimes a card) for a benefit
   (managed hosting, live OSM updates, a style editor) this project doesn't
   need yet. The self-hosted file needs no such decision and never will,
   because its cost doesn't scale with users.

**Scope of the file, and the realistic size:**

The service area is a bounded coastal corridor — St. Petersburg to Boca
Grande Pass, roughly 70 miles north–south by 30–40 miles including Tampa Bay,
Sarasota, and Charlotte Harbor, covering the 25 researched spots. That is a
genuinely good fit for a single-file basemap: comparable published PMTiles
extracts run 8MB (Philadelphia metro, zoom 0–14) to ~70MB (full Berlin,
zoom 0–14) — call this corridor **an estimated 20–60MB for a street-level
vector extract (z0–14)**, based on it being larger in area than Philadelphia
metro but mixed urban/exurban/rural rather than dense city throughout. This
is an estimate, not a measurement — `pmtiles extract` against Protomaps'
free daily planet build (`build.protomaps.com`) against this exact bounding
box is a zero-cost, no-signup CLI run that would produce the real number
before anyone commits to the approach; worth doing before scoping the
engineering work.

Satellite is the harder half. Protomaps has no imagery product — it's
OSM-derived vector data only — so satellite needs a separate source. **NAIP
(National Agriculture Imagery Program)** aerial imagery is US-government
public-domain orthoimagery at 0.6–1m resolution, downloadable free via USGS
Earth Explorer / The National Map, with no license restriction and no
attribution *requirement* (crediting "USDA FSA — NAIP" is good practice, not
a legal obligation, unlike every other satellite source in this memo). Raster
imagery pyramids are much larger than vector data for the same area — a full
pannable satellite layer over the entire 70×40-mile corridor at usable zoom
(z9–17) would plausibly run into the hundreds of MB to low GB, not the tens
of MB the street layer needs. **The scoping question that matters: does the
map need pannable satellite over the whole corridor, or satellite at the 25
known spots only?** `MapView`'s `satellite` prop is used per-location
(`center`/`mini`), which matches how the current Esri layer is actually
consumed today, per the roadmap's own note that satellite substitutes for
unlicensable location photos — not a general explore-the-coast satellite
mode. Twenty-five fixed-zoom NAIP crops would be a fraction of the size of a
full pannable layer and would probably be the better engineering target
regardless of which vendor question this memo answers.

**Trade-off, stated plainly:** this is not zero-effort. Someone has to
extract the vector tileset, source and convert the NAIP GeoTIFFs to a raster
PMTiles file (or crop it per spot), and wire MapLibre GL JS + a PMTiles
protocol handler into the app in place of Leaflet. That's backend-engineer
work, not a vendor signup, and it's more up-front effort than pointing a
`tileLayer` URL at a new host. The payoff is that the cost line disappears
permanently rather than reappearing at the next usage tier, and the offline
and privacy constraints stop being "true by accident because a hosted vendor
happens to be within its rate limit" and become true by construction.

---

## Alternatives considered

### Cheapest / lowest-effort today (not the recommendation, but real):
**Swap the raster street layer to CARTO's free OSM-based basemap tiles, keep
Leaflet.** One URL change. Fixes hi-DPI softness, improves the licensing
position over bare OSM tile-server use, costs $0, no signup required to pull
tiles (a key is optional per CARTO's docs). Does not fix satellite, does not
get vector styling/dark mode/brand theming, and does not fix offline (still a
live HTTP dependency). Good as a today-only stopgap if the team wants the
visual complaint addressed before the PMTiles work is scheduled; not a
substitute for it.

### Scale-ready / most flexible, if the product later needs things a static
file can't give it:
**MapTiler Flex or Mapbox, pay-as-you-go, rendered with MapLibre GL JS (not
their proprietary SDKs, to avoid SDK-level lock-in).** Worth reaching for if
the roadmap later adds live search-as-you-type geocoding, turn-by-turn
routing, or wants a hosted style editor so non-engineers can retheme the map
without a rebuild — none of which is on `docs/ROADMAP.md` today. Real
recurring cost that scales with usage (see cost table), requires a signed-up
paid account and a card on file even to activate Mapbox's *free* tier, and
reintroduces the "map doesn't work offline" and "vendor sees which spot the
viewport is centered on" properties this memo is trying to get away from.
Keep in the back pocket; don't reach for it now.

### Esri, done correctly (if staying with the incumbent is preferred to
switching vendors):
**ArcGIS Location Platform**, the account-based, correctly-licensed successor
to the no-key `arcgisonline.com` endpoint in use today. 2M free basemap tile
requests/month, then $0.15/tile after — comfortably free at this project's
current and near-term volume, and it directly fixes the licensing flag in the
security review without changing renderer or losing satellite quality (this
*is* the World Imagery product, just billed correctly). Requires a developer
account signup; a card may be requested even for the free tier. Doesn't fix
"looks dated" — same raster street product unless paired with their vector
styles — and doesn't fix offline. Reasonable "keep the incumbent, fix the
paperwork" option if the team doesn't want to touch the renderer at all.

---

## Cost table

| Option | Pre-launch, 0 users (today) | Modest post-launch usage* | Notes |
|---|---|---|---|
| **Self-hosted PMTiles + NAIP (recommended)** | $0 | $0 | Cost is Cloudflare storage/egress on infra already paid for; flat regardless of users. |
| CARTO free basemap (stopgap, keep Leaflet) | $0 | $0 (fair-use ceiling 5M tile requests/mo) | No card, no signup required to pull tiles. Street only — no satellite product. |
| Esri ArcGIS Location Platform | $0 (2M tiles/mo free) | $0–low ($0.15/tile past 2M) | Account signup; card may be requested. Fixes licensing, not the dated look, not offline. |
| MapLibre + MapTiler Flex | $25/mo minimum (commercial tier; free tier is non-commercial only) | ~$25–75/mo | 500k requests included on Flex; overage ~$0.10/1,000. Card + signup required. |
| MapLibre + Mapbox pay-as-you-go | $0 (50k web loads, 25k mobile MAU free) but **card required to activate** | Likely still $0 at this volume; ~$5/1,000 web loads above 50k | Card-on-file is a human action even at $0 spend. |
| Stadia Maps | Not viable free — **Free tier is explicitly non-commercial**; Starter $20/mo minimum for any revenue-generating app | $20–80/mo | Commercial subscription required from day one regardless of volume, per their own terms. |
| Native SDKs (Apple MapKit / Google Maps mobile SDK) | $0 | $0 (both currently unmetered for native mobile) | Only reachable inside the store wrappers, not the web PWA that is 100% of usage today — doesn't fix the actual problem, and duplicates the map implementation. Not in scope for v1. |

\* "Modest post-launch usage" has no roadmap-stated number to size against —
v1's monetisation section describes shop listings as the only revenue line
with no user-count target. Figures above assume a working estimate of
roughly 5,000 monthly active users, ~3 sessions/user/month, 1–2 map loads per
session (~1–1.5M tile requests/month for tile-metered vendors) — stated so
the ratio can be checked once a real number exists, not presented as a
roadmap commitment.

---

## Vendor fit notes

**Protomaps / PMTiles + NAIP (recommended)**
- *Commercial rights:* Protomaps' build tooling is open source (BSD-3); the
  underlying map data is OSM under ODbL, same attribution obligation already
  displayed (`© OpenStreetMap contributors`). NAIP is US-government
  public-domain imagery — no license restriction, no required attribution.
- *Rate limits:* none — it's a file, not an API.
- *SLA:* whatever Cloudflare's own uptime is; no separate vendor dependency.
- *Data retention/deletion:* not applicable — no user data leaves the device
  or reaches a third party.
- *Lock-in / longevity:* the strongest position in this memo. Even if
  Protomaps the company disappeared, the already-generated PMTiles file
  keeps working forever, and the OSM data plus the open-source build
  pipeline could be rerun by anyone. No proprietary style spec, no SDK
  dependency if MapLibre (open source, OSS-governed) is the renderer.

**CARTO**
- *Commercial rights:* free basemap tiles usable without disclosing
  commercial status up front; CARTO reserves the right to ask high-volume
  commercial users to move to an Enterprise agreement once usage is
  material — not a guaranteed-forever free-commercial tier, but a documented
  and currently-real free path at this project's scale.
- *Rate limits:* 5M tile requests/month fair use.
- *Satellite:* CARTO has no imagery product — street/vector basemaps only.
- *Lock-in:* low if rendered via MapLibre with CARTO as just a tile source;
  CARTO itself has pivoted business model more than once (from mapping
  toward enterprise spatial analytics), which is a mild longevity flag for
  the free basemap program specifically.

**Esri / ArcGIS Location Platform**
- *Commercial rights:* this is the correctly-licensed, account-based
  successor to the no-key endpoint currently in use — directly answers the
  security review's licensing flag for satellite.
- *Rate limits:* 2M basemap tile requests/month free, $0.15/tile after —
  expensive at real scale, fine at this project's volume.
- *Longevity:* Esri is the most durable, least-likely-to-disappear vendor in
  this memo (dominant, decades-old, privately held GIS incumbent) — but also
  the least small-developer-friendly on pricing and terms if usage ever
  grows past the free tier.
- *Requires:* developer account signup; a card may be requested even on the
  free tier.

**MapTiler**
- *Commercial rights:* free tier is explicitly non-commercial and carries a
  mandatory MapTiler logo; a commercial app needs the paid Flex tier minimum.
- *Rate limits:* 500k requests/month on Flex ($25/mo), then metered overage.
- *Satellite:* available as a paid add-on.
- *Longevity:* established FOSS4G-community player, self-hosting product
  also sold (a hedge against their own hosted-tier lock-in) — moderate risk,
  better than most.
- *Requires:* signup, card, $25/mo minimum for legitimate commercial use.

**Mapbox**
- *Commercial rights:* standard commercial terms; Mapbox attribution/logo
  required on all tiers short of an Enterprise agreement.
- *Rate limits:* 50k web map loads/month free, 25k mobile MAU free.
- *Requires:* **a card on file to activate the free tier** — a human action
  even at $0 spend, flagged below.
- *Longevity:* large, well-funded, long-established; has changed its pricing
  model multiple times historically, which is the real risk with Mapbox more
  than disappearance. Using MapLibre GL JS as the renderer against Mapbox's
  tiles (rather than their proprietary GL JS SDK) keeps a future vendor swap
  to a URL/key change rather than a rewrite.

**Stadia Maps**
- *Commercial rights:* explicitly non-commercial on the free tier; any
  revenue-generating app requires the $20/mo Starter plan minimum, from the
  first request. Doesn't fit "cheapest viable option for zero users" the way
  CARTO or the self-hosted route does, since the free tier is legally
  unavailable to this product regardless of volume.
- *Longevity:* small, indie-run, well-regarded in the OSS map community —
  real but modest longevity risk relative to Esri/Mapbox.

**Apple MapKit / Google Maps native mobile SDKs**
- *Commercial rights:* both free for native mobile use at present (Google's
  mobile Maps SDK loads are currently unmetered; Apple's native MapKit has
  no per-load cost beyond the paid Apple Developer Program membership already
  required for store distribution).
- *Location handling:* neither SDK is disqualified by the "location never
  leaves device" rule **provided the app never enables their user-location
  ("blue dot") layer** — the same discipline already applied to `MapView`.
  Using either purely to render a fixed spot coordinate would not transmit
  device GPS to Apple/Google, but does add a new subprocessor with its own
  privacy policy and analytics, which is a step beyond the current
  zero-third-party-analytics posture and should go to
  `security-privacy-reviewer` before it's adopted, not decided here.
- *Fit for this project:* only reachable inside the native wrappers, not the
  offline-first PWA that is the actual product and 100% of usage today.
  Adopting either now would mean maintaining two map implementations for no
  current benefit — out of scope for v1 per `docs/ROADMAP.md` item 5, which
  scopes the wrapper work around bundled offline content, camera species ID,
  geolocation ranking, and live NOAA/NWS data, not a native map.

---

## Requires human approval

Nothing in the recommended path (self-hosted PMTiles + NAIP, MapLibre GL JS)
requires a signup, a contract, or a card — that is part of why it fits this
stage. The items below are flagged because *other* options in this memo do,
in case the owner wants to pick one of them instead:

- **Mapbox** — requires a card on file to activate even the $0 free tier.
- **MapTiler Flex** — requires signup and a card; $25/mo minimum for any
  commercial use, so this is a real spend decision, not a free-tier trial.
- **Stadia Maps** — requires a paid subscription ($20/mo Starter minimum)
  from the first commercial request; there is no free path for this product.
- **Esri ArcGIS Location Platform** — requires a developer account signup;
  a card may be requested even for the free tier.
- **Any lawyer read of OSM/Esri terms** (already flagged in
  `docs/review/security-privacy-review.md`) — legal judgment, not resolved
  here.
- **Any adoption of Apple/Google native map SDKs** — new subprocessor,
  should route through `security-privacy-reviewer` before a decision, not
  after.

No spend has been committed. No account has been created. This memo is
research only.
