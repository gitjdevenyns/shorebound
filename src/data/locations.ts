import type {
  AccessType,
  Location,
  Region,
  SourceRef,
  TargetRecipe,
  TidePlaybook,
  TideStage,
  TideStationRef,
} from './types';

/**
 * The 15 original locations were migrated from v6 window.SPOTS (data.js); the
 * 10 Tampa Bay / Sarasota spots below them were researched fresh.
 *
 * - Slugs are new, stable kebab-case identifiers (used in /locations/:slug).
 * - tide_playbook reproduces the v6 tidePlay() heuristic from supplement.js:
 *   stage text is derived from the location's structures, and the original
 *   one-line "tide" recommendation is kept as best_window. The newer spots use
 *   the same helper so every page reads the same way.
 * - Tide stations: every location has a verified NOAA CO-OPS station (see the
 *   station block below). This closes KNOWN_ISSUES.md #4 — Englewood, Placida
 *   and Boca Grande are no longer pending.
 * - seasons, access_notes, safety and sources did not exist in v6, so the
 *   original 15 still have them empty — do not treat empty as "no fish here"
 *   or "no hazard here". The 10 newer spots fill them in from the sources
 *   cited on each entry; anything that could not be sourced was left empty
 *   rather than guessed.
 *
 * `images` is empty for all 25 spots and is expected to stay that way: there
 * is no licensed photograph of a minor local fishing spot that we can verify
 * actually shows that spot, and a mislabelled one would be worse than none.
 * Screens that need to show a place render a live Esri satellite map of its
 * coordinates instead (Home's "Go here now" card, LocationDetail's hero band
 * and access panel) — real, correct imagery of the actual water, with no
 * provenance problem. Do not re-point these slots at a stock photo.
 */

/**
 * NOAA CO-OPS tide stations.
 *
 * Every id below was verified against the CO-OPS metadata API
 * (`/mdapi/prod/webapi/stations/{id}.json`) — name, state and coordinates all
 * confirmed — and each one returns live high/low predictions. Each location is
 * assigned the nearest station on the same body of water, which matters more
 * than raw distance: a station across a barrier island can be an hour off.
 *
 * This mirrors `public.tide_stations` / `locations.tide_station_id` in Supabase,
 * so the bundled offline copy and the live snapshots agree on which station
 * backs which spot.
 */
const station = (noaa_id: string, label: string): TideStationRef => ({
  noaa_id,
  name: `NOAA ${label} ${noaa_id}`,
  url: `https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=${noaa_id}`,
});

/** Manatee River proper — the Green Bridge / Riverwalk stretch. */
const STATION_BRADENTON = station('8726247', 'Bradenton, Manatee River');
/** River mouth, immediately off Emerson Point / Snead Island. */
const STATION_DESOTO_POINT = station('8726273', 'Desoto Point');
const STATION_PALMA_SOLA_N = station('8726249', 'Palma Sola Bay North');
const STATION_PALMA_SOLA_S = station('8726233', 'Palma Sola Bay South');
/** Cortez / north Sarasota Bay, incl. Longboat Pass and the AMI bay side. */
const STATION_CORTEZ = station('8726217', 'Cortez');
const STATION_ANNA_MARIA = station('8726282', 'Anna Maria, City Pier');
const STATION_ENGLEWOOD = station('8725747', 'Englewood, Lemon Bay');
const STATION_PLACIDA = station('8725667', 'Placida, Gasparilla Sound');
/** The one reference (harmonic) station in the set; the rest are subordinate. */
const STATION_BOCA_GRANDE = station('8725577', 'Port Boca Grande, Charlotte Harbor');

/*
 * Tampa Bay and Sarasota Bay stations, added with the northern expansion.
 *
 * Same-body-of-water assignment matters even more up here than it does around
 * Anna Maria, because the tide takes well over an hour to travel from the bay
 * mouth to the top of the bay. Predicted highs for one sample day, south to
 * north: Egmont Key 10:11, Mullet Key 10:23, Tierra Verde 10:39,
 * Point Pinellas 11:37, St. Petersburg 11:59, Gandy Bridge (Old Tampa Bay)
 * 12:58. Picking "the nearest dot on the map" across a basin boundary is
 * therefore worth roughly an hour of error, so each spot below is matched to
 * the water it actually sits on.
 */
/** Big Sarasota Pass — the pass South Lido fishes. */
const STATION_BIG_SARASOTA_PASS = station('8726034', 'Siesta Key, Big Sarasota Pass');
/** South Longboat Key, Sarasota Bay — the water either side of New Pass. */
const STATION_LONGBOAT_KEY = station('8726089', 'Longboat Key, Sarasota Bay');
/** Egmont Channel, the deep Gulf entrance to Tampa Bay. */
const STATION_EGMONT_KEY = station('8726347', 'Egmont Key, Tampa Bay');
/** Mullet Key Channel at the Skyway — open lower-bay water. */
const STATION_MULLET_KEY = station('8726364', 'Mullet Key, Tampa Bay');
/** Bunces Pass / Pass-a-Grille Channel system behind the barrier islands. */
const STATION_TIERRA_VERDE = station('8726428', 'Tierra Verde');
/** Harmonic reference station on the downtown St. Pete waterfront. */
const STATION_ST_PETERSBURG = station('8726520', 'St. Petersburg, Tampa Bay');

/**
 * Port of the v6 tidePlay() structure heuristic (supplement.js):
 * grass/mangrove/oyster structures make the incoming tide a prime window;
 * drain/pass/channel/bridge/piling structures make the outgoing prime.
 */
function playbook(structures: string[], bestWindow: string): TidePlaybook {
  const st = structures.join(' ').toLowerCase();
  const incoming =
    st.includes('grass') || st.includes('mangrove') || st.includes('oyster');
  const outgoing =
    st.includes('drain') ||
    st.includes('pass') ||
    st.includes('channel') ||
    st.includes('bridge') ||
    st.includes('piling');
  const prime: TideStage[] = [];
  if (incoming) prime.push('incoming');
  if (outgoing) prime.push('outgoing');
  return {
    low: incoming
      ? 'Scout exposed structure, edges and potholes; fish remaining depth.'
      : 'Look for the deepest nearby channel/edge and visible current seams.',
    incoming: incoming
      ? 'Prime window: follow rising water toward grass, oyster edges and mangroves.'
      : 'Fish the up-current face, seam and any bait pushed through structure.',
    high: st.includes('mangrove')
      ? 'Work flooded roots, points and pockets; fish may spread out.'
      : 'Target shade, points, structure and bait concentrations.',
    outgoing: outgoing
      ? 'Prime window: intercept bait being pulled through the pass/channel/bridge zone.'
      : 'Back off to outer edges, drains, potholes and the first deeper water.',
    prime_stages: prime,
    best_window: bestWindow,
  };
}

/**
 * Map a target species label to a fish guide id (null = no guide entry yet).
 *
 * The v6 labels are kept verbatim rather than rewritten, so the ambiguous ones
 * are aliased instead: on this coast a spoon-caught "Mackerel" off a pier or a
 * beach is a Spanish mackerel, and an inshore "Jack" is a jack crevalle. Both
 * point at the species page that actually covers the fish. A label with no
 * guide entry — kingfish — is deliberately left unmapped rather than pointed at
 * a near-miss page.
 */
const SPECIES_IDS: Record<string, string> = {
  Snook: 'snook',
  Redfish: 'redfish',
  Trout: 'trout',
  Tarpon: 'tarpon',
  Snapper: 'snapper',
  Sheepshead: 'sheepshead',
  Ladyfish: 'ladyfish',
  'Black drum': 'black-drum',
  Pompano: 'pompano',
  'Spanish mackerel': 'spanish-mackerel',
  Mackerel: 'spanish-mackerel',
  'Jack crevalle': 'jack-crevalle',
  Jack: 'jack-crevalle',
};

/** Conservative mapping of v6 free-text rig strings to rig ids. */
const RIG_IDS: Record<string, string> = {
  'free-line': 'free-line',
  'popping cork': 'popping-cork',
  knocker: 'knocker',
  'weedless paddletail': 'weedless-paddletail',
  weedless: 'weedless-paddletail',
  jig: 'jig-head',
  'fish-finder': 'fish-finder',
  // A pompano surf rig is a dropper-loop rig, not a fish-finder, and a
  // sheepshead "bottom rig" is a short knocker-ish dropper — neither is one of
  // the six documented schematics, so both stay unmapped rather than being
  // pointed at a rig the angler would then tie wrong.
};

interface RawTarget {
  species: string;
  rig: string;
  hook: string;
  leader: string;
  weight: string;
  bait: string;
}

function targets(raw: RawTarget[]): TargetRecipe[] {
  return raw.map((t, i) => ({
    species_id: SPECIES_IDS[t.species] ?? null,
    species_label: t.species,
    priority: i + 1,
    rig_id: RIG_IDS[t.rig] ?? null,
    rig: t.rig,
    hook: t.hook,
    leader: t.leader,
    weight: t.weight,
    bait: t.bait,
  }));
}

interface RawSpot {
  id: string;
  slug: string;
  name: string;
  region: Region;
  lat: number;
  lng: number;
  access: AccessType[];
  structures: string[];
  station: TideStationRef;
  tide: string;
  dayparts?: string[];
  targets: RawTarget[];
  /**
   * Researched fields. The v6 spots have none of these; omit them rather than
   * writing a plausible-sounding string, because the location page renders
   * "not documented yet" honestly and that is the correct answer for anything
   * nobody has actually checked.
   */
  seasons?: string[];
  accessNotes?: string[];
  safety?: string[];
  sources?: SourceRef[];
}

/**
 * Per-pier entry in FWC's Boating and Angling Guide to Tampa Bay — the most
 * authoritative public record of what each pier is, what it has on it, and
 * whether it charges.
 */
const fwcPier = (path: string, label: string): SourceRef => ({
  id: 'fwc-pier',
  label,
  url: `https://gis.myfwc.com/boating_guides/Tampa_Bay/pages/fishing_piers/${path}/index.html`,
  publisher: 'FWC — Boating and Angling Guide to Tampa Bay',
});

/** The NOAA CO-OPS station page the spot's predictions actually come from. */
const noaaSource = (st: TideStationRef, note?: string): SourceRef => ({
  id: 'noaa-station',
  label: `${st.name} — tide predictions`,
  url: st.url as string,
  publisher: 'NOAA Tides & Currents',
  note,
});

const RAW: RawSpot[] = [
  {
    id: 'emerson-point',
    slug: 'emerson-point',
    name: 'Emerson Point / Snead Island',
    region: 'Bradenton',
    lat: 27.5208,
    lng: -82.644,
    access: ['shore', 'kayak'],
    structures: ['grass', 'oyster', 'mangrove'],
    station: STATION_DESOTO_POINT,
    tide: 'Low incoming',
    targets: [
      { species: 'Redfish', rig: 'weedless paddletail', hook: '3/0–4/0', leader: '20–25 lb', weight: '1/16–1/8 oz', bait: 'shrimp/paddletail' },
      { species: 'Trout', rig: 'popping cork', hook: '1/0–2/0', leader: '15–20 lb', weight: 'light jig', bait: 'live shrimp' },
      { species: 'Snook', rig: 'free-line', hook: '2/0–4/0', leader: '30–40 lb', weight: 'none', bait: 'pilchard/pinfish' },
      // Live shell on three sides of the point: black drum work the bar edges
      // nose-down for the same shellfish the redfish are after.
      { species: 'Black drum', rig: 'fish-finder', hook: '2/0–3/0 circle', leader: '25–30 lb', weight: '1/2 oz slider', bait: 'fresh dead shrimp/cut crab' },
    ],
    seasons: [
      'Jun–Aug snook, redfish and trout staging off the point as the river freshens',
      'Trout on the flats around the point most of the year',
    ],
    accessNotes: [
      'Manatee County preserve at 5801 17th Street West, Palmetto, open daily from sunrise to sunset, 365 days a year.',
      'The fishing dock is closed until further notice after hurricane damage — the county alert is still live. There are other docks along the walking trails you can fish from, but no cast netting anywhere in the preserve.',
      'Two paddle launches and no boat ramp: the beach at the west end, straight into the mouth of the Manatee River, and a second launch about six-tenths of a mile in with a wooden dock onto the Blueway Trail through the mangrove tunnels to Terra Ceia Bay.',
    ],
    safety: [
      'Mosquitoes here can be intense at some times of year, and Milton took much of the canopy down, so there is less shade than there was.',
    ],
    sources: [
      {
        id: 'mymanatee-1',
        label: 'Emerson Point Preserve — hours, launches, dock closure',
        url: 'https://www.mymanatee.org/connect/locations/location-details/emerson-point-preserve',
        publisher: 'Manatee County Government',
      },
      {
        id: 'floridahikes-2',
        label: 'Emerson Point Preserve — post-Milton conditions and facilities',
        url: 'https://floridahikes.com/emerson-point-preserve/',
        publisher: 'Florida Hikes',
      },
    ],
  },
  {
    id: 'palma-sola-bay',
    slug: 'palma-sola-bay',
    name: 'Palma Sola Bay',
    region: 'Bradenton',
    lat: 27.4962,
    lng: -82.6684,
    access: ['shore', 'wade'],
    structures: ['grass', 'potholes'],
    station: STATION_PALMA_SOLA_N,
    tide: 'Moving tide',
    dayparts: ['dawn', 'night'],
    targets: [
      { species: 'Trout', rig: 'popping cork', hook: '1/0–2/0', leader: '15–20 lb', weight: 'light', bait: 'shrimp' },
      { species: 'Redfish', rig: 'weedless paddletail', hook: '3/0–4/0', leader: '20–25 lb', weight: '1/16–1/8 oz', bait: 'paddletail' },
      { species: 'Snook', rig: 'free-line', hook: '2/0–4/0', leader: '30–40 lb', weight: 'none', bait: 'pilchard' },
    ],
    seasons: [
      'Dec–Mar trout in the back reaches of the bay',
      'Aug–Sep snook and trout around the dock and bridge lights',
      'Redfish along the shorelines and docks most of the year',
    ],
    accessNotes: [
      'Palma Sola Causeway Park, 9500 Manatee Avenue West on SR 64 between Bradenton and Anna Maria Island. The park is open sunrise to sunset unless posted otherwise.',
      'The boat ramp is governed separately — the county lists its ramps as 24-hour, and the only posted restriction here is no overnight parking, under Ordinance 23-121.',
      'The ramp is free: one lane, paved, with docks, about twenty parking spaces, wheelchair accessible, and no restrooms at the ramp itself.',
      'A short county fishing pier sits further along the causeway at 9450 Manatee Ave W — dawn to dusk, no fee, restrooms, fresh water and monofilament recycling, but no bait, no fish-cleaning table and not wheelchair accessible.',
      'The pier does not provide a fishing licence — bring your own.',
    ],
    safety: [
      'No lifeguard. Manatee County guards only Coquina Beach and Manatee Public Beach.',
      'The ramp has a history of sanding in — the county closed it for six months in 2019 after an inspection found shallow conditions at the end of the ramp that made launching and landing difficult at low tide.',
    ],
    sources: [
      {
        id: 'mymanatee-1',
        label: 'Palma Sola Causeway Park — hours and facilities',
        url: 'https://www.mymanatee.org/connect/locations/location-details/palma-sola-causeway-park',
        publisher: 'Manatee County Government',
      },
      {
        id: 'mymanatee-2',
        label: 'Palma Sola Causeway boat ramp — no overnight parking (Ordinance 23-121)',
        url: 'https://www.mymanatee.org/connect/locations/location-details/palma-sola-causeway-boat-ramp',
        publisher: 'Manatee County Government',
      },
      {
        id: 'gis-3',
        label: 'Palma Sola Causeway fishing pier — facilities, hours, licence status',
        url: 'https://gis.myfwc.com/boating_guides/tampa_bay/pages/fishing_piers/palma_sola_causeway/mobile_index.html',
        publisher: 'FWC — Boating and Angling Guide to Tampa Bay',
      },
    ],
  },
  {
    id: 'green-bridge',
    slug: 'green-bridge',
    name: 'Green Bridge',
    region: 'Bradenton',
    lat: 27.514,
    lng: -82.574,
    access: ['shore', 'pier'],
    structures: ['pilings', 'channel', 'lights'],
    station: STATION_BRADENTON,
    tide: 'Night moving tide',
    dayparts: ['night'],
    targets: [
      { species: 'Snook', rig: 'live bait', hook: '3/0–5/0', leader: '40–60 lb', weight: '0–1 oz', bait: 'pinfish/pilchard' },
      { species: 'Snapper', rig: 'knocker', hook: '1/0–2/0', leader: '20–30 lb', weight: '1/4–1 oz', bait: 'shrimp/pilchard' },
      { species: 'Sheepshead', rig: 'bottom rig', hook: '1/0', leader: '20–30 lb', weight: '1/4–1 oz', bait: 'shrimp/crab' },
      // Bridge lights over moving water is the classic ladyfish set-up, and
      // this is the easiest fish to catch here for anyone still learning.
      { species: 'Ladyfish', rig: 'jig', hook: '1/4 oz jig head', leader: '20 lb', weight: 'jig', bait: 'white paddletail/small jig' },
      // Deep river holes beside the pilings — bait on the bottom, not swum past.
      { species: 'Black drum', rig: 'fish-finder', hook: '3/0–5/0 circle', leader: '30–40 lb', weight: '1–3 oz slider', bait: 'cut blue crab/dead shrimp' },
    ],
    seasons: [
      'Mar–Nov snook from the bridge down to the river mouth',
      'Dec–Mar sheepshead on the bridge pilings',
    ],
    accessNotes: [
      'The pier is the surviving span of the 1927 bridge, on the Palmetto side of the river in Riverside Park at Riverside Drive and 9th Ave W — not the Bradenton bank.',
      'Free, with no entrance fee, and listed as open 24 hours; the boat ramp in the same park is listed 7 am to 11 pm, so if you are relying on that parking, treat the shorter window as the real one.',
      'The City of Palmetto rents the pier out for tournaments and festivals at $200 a day, so it can be closed to casual anglers without warning. Manatee County repaired the rails in April 2026 and is separately evaluating demolition and replacement.',
    ],
    safety: [
      'A 1920s structure roughly two thousand feet long and thirty-four feet wide, with no shade for its length. Manatee County has inspected it, costed demolition and replacement, and is not planning to keep patching it — take every barricade and closure sign here literally.',
    ],
    sources: [
      {
        id: 'gis-1',
        label: 'Riverside Park / Green Bridge Pier — facilities, hours, licence status',
        url: 'https://gis.myfwc.com/boating_guides/tampa_bay/pages/fishing_piers/riverside_park/mobile_index.html',
        publisher: 'FWC — Boating and Angling Guide to Tampa Bay',
      },
      {
        id: 'palmettofl-2',
        label: 'City of Palmetto facility rental fees — the pier can be booked for events',
        url: 'https://www.palmettofl.org/198/Facilities-Rental-Fees',
        publisher: 'City of Palmetto',
      },
      {
        id: 'pulseofmanatee-3',
        label: 'Green Bridge Fishing Pier rail repairs, April 2026',
        url: 'https://www.pulseofmanatee.com/p/green-bridge-fishing-pier-repairs',
        publisher: 'Pulse of Manatee (6 April 2026); Manatee County Government official Facebook account',
      },
    ],
  },
  {
    id: 'bradenton-riverwalk',
    slug: 'bradenton-riverwalk',
    name: 'Bradenton Riverwalk',
    region: 'Bradenton',
    lat: 27.4989,
    lng: -82.5688,
    access: ['shore'],
    structures: ['seawall', 'docks'],
    station: STATION_BRADENTON,
    tide: 'Moving tide',
    targets: [
      { species: 'Snook', rig: 'free-line', hook: '2/0–3/0', leader: '30 lb', weight: 'none', bait: 'shrimp/pilchard' },
      { species: 'Snapper', rig: 'knocker', hook: '1/0', leader: '20–25 lb', weight: '1/4–1/2 oz', bait: 'shrimp' },
      { species: 'Jack', rig: 'casting lure', hook: 'single hook', leader: '25–30 lb', weight: 'lure', bait: 'spoon/topwater' },
      // Seawall and dock pilings in the river carry barnacle and oyster growth,
      // which is the whole reason sheepshead sit on them.
      { species: 'Sheepshead', rig: 'bottom rig', hook: '1–1/0 short shank', leader: '20 lb fluoro', weight: '1/4–1/2 oz', bait: 'fiddler crab/live shrimp' },
    ],
    accessNotes: [
      'The Riverwalk is the only City of Bradenton park open 24 hours a day — every other city park closes at 9 pm. That makes it the guide\'s most straightforward night-fishing shoreline.',
      'A 2.03-mile riverfront strip between the Green Bridge and the DeSoto Bridge, along Barcarrota Blvd, Waterfront Drive and Riverside Drive. There is a dock at 452 3rd Ave W, inside Rossi Park.',
      'Downtown parking is free until further notice, including the 500-space City Centre garage on 3rd Avenue West between 10th and 12th Streets, plus the Judicial Center garage, the County Administration Building and the Post Office lot.',
      'The city says plainly that most anglers need a licence and points you at FWC — no pier licence covers this shoreline. Alcohol is prohibited; leashed dogs are fine.',
    ],
    sources: [
      {
        id: 'cityofbradenton-1',
        label: 'City of Bradenton parks — hours, alcohol and dog rules, fishing licences',
        url: 'https://cityofbradenton.com/parksrec',
        publisher: 'City of Bradenton',
      },
      {
        id: 'cityofbradenton-2',
        label: 'Downtown Bradenton public parking',
        url: 'https://cityofbradenton.com/parking',
        publisher: 'City of Bradenton',
      },
      {
        id: 'mymanatee-3',
        label: 'Bradenton Riverwalk Pier — location',
        url: 'https://www.mymanatee.org/connect/locations/location-details/bradenton-riverwalk-pier',
        publisher: 'Manatee County Government',
      },
    ],
  },
  {
    id: 'bridge-street-pier',
    slug: 'bridge-street-pier',
    name: 'Bridge Street / Bradenton Beach',
    region: 'Anna Maria',
    lat: 27.4677,
    lng: -82.698,
    access: ['pier', 'shore'],
    structures: ['pilings', 'current'],
    station: STATION_CORTEZ,
    tide: 'Moving tide',
    dayparts: ['night'],
    targets: [
      { species: 'Snook', rig: 'live bait', hook: '3/0–5/0', leader: '40 lb', weight: 'light', bait: 'pilchard' },
      { species: 'Snapper', rig: 'knocker', hook: '1/0–2/0', leader: '20–30 lb', weight: '1/2 oz', bait: 'shrimp' },
      { species: 'Mackerel', rig: 'casting spoon', hook: 'single hook', leader: '30–40 lb bite leader', weight: '1/2–1 oz', bait: 'spoon' },
      // A walk-on pier in current: the most reliable fish here for a first
      // saltwater catch, and it will keep coming back for the same jig.
      { species: 'Ladyfish', rig: 'jig', hook: '1/8–1/4 oz jig', leader: '20 lb', weight: 'jig', bait: 'white jig/small silver spoon' },
    ],
    seasons: [
      'Dec–Mar sheepshead on the barnacled pilings',
      'Apr–May Spanish mackerel off the pier',
    ],
    accessNotes: [
      'The Historic Bradenton Beach City Pier, at the end of Bridge Street on the Sarasota Bay side. Walking on is free; the city publishes no opening or closing time, so read the signs at the head of the pier.',
      'Public restrooms, a restaurant and a retail shop on the pier, plus a public day dock and a dinghy dock. The Richard P. Suhre Pavilion at the bay end is the only shade on the deck.',
      'City parking lots on the island are free and close at 9 pm; overnight parking is prohibited. The main lot is off 1st Street North just east of the Circle K, and the free island trolley runs every 20 minutes from 6 am to 10.30 pm.',
      'Hurricane repairs to decking, pilings, handrails and the floating docks were still under way in 2026 under an agreement running to 30 September — expect sections to be fenced.',
      'No easy bait stop on this stretch since Annie’s in Cortez was demolished in 2025 — the nearest live bait is Bridge Street Bait Shop, or Island Discount Tackle four miles north. Buy before you drive out.',
    ],
    safety: [
      'The pier has a working public day dock and dinghy dock, and boats come alongside all day. Cast clear of the docking area rather than over it.',
    ],
    sources: [
      {
        id: 'cityofbradentonbeach-1',
        label: 'Historic Bradenton Beach City Pier — facilities and access',
        url: 'https://www.cityofbradentonbeach.com/179/City-Pier',
        publisher: 'City of Bradenton Beach',
      },
      {
        id: 'cityofbradentonbeach-2',
        label: 'Bradenton Beach parking and island trolley',
        url: 'https://www.cityofbradentonbeach.com/180/Parking',
        publisher: 'City of Bradenton Beach',
      },
      {
        id: 'pulseofmanatee-3',
        label: 'Bradenton Beach extends hurricane pier-repair agreement to 30 September',
        url: 'https://www.pulseofmanatee.com/p/bradenton-beach-approves-updated',
        publisher: 'Pulse of Manatee (29 March 2026)',
      },
    ],
  },
  {
    id: 'longboat-pass',
    slug: 'longboat-pass',
    name: 'Longboat Pass',
    region: 'Anna Maria',
    lat: 27.4414,
    lng: -82.6916,
    access: ['shore', 'boat'],
    structures: ['deep pass', 'bridge'],
    station: STATION_CORTEZ,
    tide: 'Strong moving tide',
    dayparts: ['day', 'dusk'],
    targets: [
      { species: 'Snook', rig: 'live bait drift', hook: '4/0–5/0', leader: '40–60 lb', weight: '1/2–2 oz', bait: 'pinfish' },
      { species: 'Tarpon', rig: 'live crab', hook: '5/0–8/0', leader: '60–80 lb', weight: 'drift dependent', bait: 'crab/threadfin' },
      { species: 'Snapper', rig: 'knocker', hook: '2/0', leader: '30 lb', weight: '1/2–1 oz', bait: 'pilchard' },
      // Spring and autumn bait runs funnel straight through the pass mouth.
      { species: 'Spanish mackerel', rig: 'casting spoon', hook: 'single hook', leader: '30–40 lb bite leader', weight: '1/2–1 oz spoon', bait: 'silver spoon/white jig' },
      // Jacks push bait against the bridge fenders and the pass edge — heavier
      // gear than the rest of this list, because they do not give up.
      { species: 'Jack crevalle', rig: 'casting lure', hook: 'single inline hooks', leader: '40–50 lb', weight: 'lure', bait: 'topwater plug/1 oz jig' },
    ],
    seasons: [
      'Spanish mackerel through the pass spring and fall',
      'May–Jun tarpon schools through the pass',
      'Sep–Oct snook on the pass edges and the beach',
      'Jan–Feb pompano and whiting through the pass',
    ],
    accessNotes: [
      'Shore access on the Anna Maria side is through the two Coquina Bayside boat ramps on Gulf Drive South; both are posted no overnight parking under Ordinance 23-121.',
      'On the Longboat Key side, the public access at 100 North Shore Road has about thirty parking spaces on site.',
      'Longboat Key closes every public beach and bay access from 11 pm to 5 am, so the south side of the pass is not a legal night-fishing spot.',
      'FDOT has no construction project on this bridge, but its replacement study was due to finish in mid-2026 — the bridge you fish today may not be the bridge that is here in a decade.',
      'No easy bait stop on this stretch since Annie’s in Cortez was demolished in 2025 — the nearest live bait is Bridge Street Bait Shop, or Island Discount Tackle four miles north. Buy before you drive out.',
    ],
    safety: [
      'There are no lifeguards anywhere on Longboat Key.',
    ],
    sources: [
      {
        id: 'longboatkey-1',
        label: 'Longboat Key public beach and bay accesses — parking, hours, no lifeguards',
        url: 'https://www.longboatkey.org/331/Beaches',
        publisher: 'Town of Longboat Key',
      },
      {
        id: 'mymanatee-2',
        label: 'Coquina Bayside North boat ramp',
        url: 'https://www.mymanatee.org/connect/locations/location-details/coquina-bayside-north-boat-ramp',
        publisher: 'Manatee County Government',
      },
      {
        id: 'swflroads-3',
        label: 'SR 789 bridge over Longboat Pass — replacement PD&E study',
        url: 'https://www.swflroads.com/project/436676-1',
        publisher: 'Florida Department of Transportation, District One',
      },
    ],
  },
  {
    id: 'coquina-beach',
    slug: 'coquina-beach',
    name: 'Coquina Beach',
    region: 'Anna Maria',
    lat: 27.4438,
    lng: -82.691,
    access: ['shore'],
    structures: ['surf trough', 'pass edge'],
    station: STATION_CORTEZ,
    tide: 'Dawn/dusk',
    dayparts: ['dawn', 'dusk'],
    targets: [
      { species: 'Snook', rig: 'free-line/jig', hook: '2/0–4/0', leader: '30–40 lb', weight: '0–3/8 oz', bait: 'pilchard/paddletail' },
      { species: 'Pompano', rig: 'surf rig', hook: '1/0', leader: '15–20 lb', weight: '1–3 oz pyramid', bait: 'sand flea/shrimp' },
      { species: 'Mackerel', rig: 'spoon', hook: 'single hook', leader: '30–40 lb bite', weight: 'lure', bait: 'spoon' },
    ],
    seasons: [
      'Jan–Mar pompano and whiting in the trough',
      'Aug–Oct snook in the surf',
    ],
    accessNotes: [
      'Manatee County beach park at 2650 Gulf Drive, Bradenton Beach, open sunrise to sunset unless posted otherwise.',
      'Parking is free and there is a lot of it, but the island lots close at 9 pm and overnight parking is prohibited. A free island trolley serves the park.',
      'Restrooms, showers, changing cabanas, concessions and a gift shop on site. Three beach wheelchairs and a walker are lent free at the concession stand, first come first served.',
      'Lifeguards are on duty 9 am to 5 pm, and to 7 pm between Memorial Day and Labor Day — outside those hours nobody is watching the water.',
      'Sea turtle nesting runs 1 May to 31 October: no lights on the beach after dark and all furniture off the sand at dusk. Alcohol, glass, pets, drones and fireworks are prohibited year-round.',
      'No easy bait stop on this stretch since Annie’s in Cortez was demolished in 2025 — the nearest live bait is Bridge Street Bait Shop, or Island Discount Tackle four miles north. Buy before you drive out.',
    ],
    safety: [
      'Lifeguards cover 9 am to 5 pm, and to 7 pm in summer. Dawn and dusk — the two best windows here — are unguarded.',
      'Read the flags before you wade: two red is closed water, one red is high hazard or strong current, purple is dangerous marine life.',
      'If a rip takes you, do not swim against it. Swim parallel to the beach until you are out of it, then in.',
      'Two county boat ramps discharge into Longboat Pass immediately south of the beach — expect traffic close in at the south end.',
    ],
    sources: [
      {
        id: 'mymanatee-1',
        label: 'Coquina Beach — hours, amenities, wheelchairs, turtle season',
        url: 'https://www.mymanatee.org/connect/locations/location-details/coquina-beach',
        publisher: 'Manatee County Government',
      },
      {
        id: 'mymanatee-2',
        label: 'Manatee County lifeguarded beaches, flag system and rip-current guidance',
        url: 'https://www.mymanatee.org/services-and-amenities/service-listing/service-details/find-a-lifeguarded-beach',
        publisher: 'Manatee County Government',
      },
    ],
  },
  {
    id: 'bean-point',
    slug: 'bean-point',
    name: 'Bean Point',
    region: 'Anna Maria',
    lat: 27.5387,
    lng: -82.7443,
    access: ['shore'],
    structures: ['point', 'surf cuts'],
    station: STATION_ANNA_MARIA,
    tide: 'Moving water',
    dayparts: ['dawn', 'dusk'],
    targets: [
      { species: 'Snook', rig: 'live bait', hook: '3/0–5/0', leader: '30–40 lb', weight: 'light', bait: 'pilchard' },
      { species: 'Tarpon', rig: 'live crab', hook: '5/0–8/0', leader: '60–80 lb', weight: 'none', bait: 'crab' },
      { species: 'Pompano', rig: 'surf rig', hook: '1/0', leader: '15–20 lb', weight: '1–3 oz', bait: 'sand flea' },
    ],
    seasons: [
      'May–Jun tarpon in the pass and over the sandbar',
      'Jan–Feb pompano and whiting in the surf off the point',
      'Sep–Oct snook off the point on the outgoing',
    ],
    accessNotes: [
      'Anna Maria enforces parking hard: all tyres off the pavement, nothing within 30 feet of a stop sign or 20 feet of an intersection, nothing on a sidewalk or blocking a drive. Park with the flow of traffic and read every sign.',
      'No restrooms at the point. The nearest are at Anna Maria Bayfront Park, 310 North Bay Boulevard, open sunrise to sunset with restrooms and showers.',
      'No dogs, no glass, no alcohol, no fires and no anchoring a boat to the beach. During turtle season, 1 May to 31 October, any light that reaches the beach is prohibited — which rules out the way most people fish a beach at night.',
    ],
    safety: [
      'No lifeguard. Manatee County guards only Coquina, Cortez and Manatee Public beaches — Bean Point is not one of them.',
    ],
    sources: [
      {
        id: 'cityofannamaria-1',
        label: 'Anna Maria parking enforcement — what gets you a citation',
        url: 'https://www.cityofannamaria.com/182/Parking-Enforcement',
        publisher: 'City of Anna Maria',
      },
      {
        id: 'cityofannamaria-2',
        label: 'Anna Maria beach regulations and turtle-season lighting',
        url: 'https://www.cityofannamaria.com/226/Beach-Regulations',
        publisher: 'City of Anna Maria',
      },
      {
        id: 'mymanatee-3',
        label: 'Manatee County lifeguarded beaches, flag system and rip-current guidance',
        url: 'https://www.mymanatee.org/services-and-amenities/service-listing/service-details/find-a-lifeguarded-beach',
        publisher: 'Manatee County Government',
      },
    ],
  },
  {
    id: 'cortez-bridge',
    slug: 'cortez-bridge',
    name: 'Cortez Bridge',
    region: 'Bradenton',
    lat: 27.4669,
    lng: -82.6883,
    access: ['shore', 'bridge'],
    structures: ['bridge', 'docks'],
    station: STATION_CORTEZ,
    tide: 'Moving tide',
    targets: [
      { species: 'Snook', rig: 'live bait', hook: '3/0–5/0', leader: '40–50 lb', weight: '0–1 oz', bait: 'pinfish' },
      { species: 'Snapper', rig: 'knocker', hook: '1/0–2/0', leader: '20–30 lb', weight: '1/4–1 oz', bait: 'shrimp' },
      { species: 'Trout', rig: 'jig', hook: '1/8–1/4 oz jig', leader: '15–20 lb', weight: 'jig', bait: 'paddletail' },
      // Barnacled bridge pilings and the dock line either side of them.
      { species: 'Sheepshead', rig: 'bottom rig', hook: '1/0 short shank', leader: '25 lb fluoro', weight: '1/2–1 oz', bait: 'fiddler crab/live shrimp' },
      // The deeper scour beside the bridge holds drum on a moving tide.
      { species: 'Black drum', rig: 'fish-finder', hook: '3/0–4/0 circle', leader: '30 lb', weight: '1–2 oz slider', bait: 'dead shrimp/cut crab' },
    ],
    seasons: [
      'Trout on the Anna Maria Sound and Sarasota Bay grass most of the year',
      'Mar–Apr mangrove snapper on the bridge pilings',
    ],
    accessNotes: [
      'FDOT began construction of the replacement bridge in September 2026 — a 1,200-day project. The existing bridge stays open to traffic and pedestrians through Phase 1; the old drawbridge is demolished in Phase 2, with the second traffic shift expected mid-2028.',
      'Traffic is shifted slightly south at both approaches while crews build the north half of the new bridge, and the work is being done from barges and temporary trestles in the water either side of the span.',
      'No easy bait stop on this stretch since Annie’s in Cortez was demolished in 2025 — the nearest live bait is Bridge Street Bait Shop, or Island Discount Tackle four miles north. Buy before you drive out.',
    ],
    safety: [
      'This is now an active construction site. Barges, temporary trestles and work boats operate in the channel either side of the bridge for the life of the project — do not fish, drift or anchor into the work zone.',
      'The 1956 drawbridge is scheduled for demolition in Phase 2. Treat every barricade, cone and closure sign here as current, because the layout changes as the job moves.',
    ],
    sources: [
      {
        id: 'swflroads-1',
        label: 'Cortez Bridge (SR 684) replacement — phases, schedule and construction method',
        url: 'https://www.swflroads.com/project/430204-2',
        publisher: 'Florida Department of Transportation, District One',
      },
      {
        id: 'yourobserver-2',
        label: 'Cortez Bridge replacement to start soon',
        url: 'https://www.yourobserver.com/news/2026/aug/13/cortez-bridge-replacement-soon/',
        publisher: 'Your Observer (13 August 2026)',
      },
    ],
  },
  {
    id: 'south-palma-sola-flats',
    slug: 'south-palma-sola-flats',
    name: 'South Palma Sola Flats',
    region: 'Bradenton',
    lat: 27.4798,
    lng: -82.6758,
    access: ['kayak', 'wade'],
    structures: ['grass', 'potholes'],
    station: STATION_PALMA_SOLA_S,
    tide: 'Low incoming',
    dayparts: ['dawn'],
    targets: [
      { species: 'Trout', rig: 'paddletail', hook: '1/8–1/4 oz jig', leader: '15–20 lb', weight: 'jig', bait: 'paddletail' },
      { species: 'Redfish', rig: 'weedless', hook: '3/0–4/0', leader: '20–25 lb', weight: '1/16–1/8 oz', bait: 'paddletail' },
      { species: 'Snook', rig: 'jerk shad', hook: '3/0–4/0', leader: '25–30 lb', weight: 'light', bait: 'jerk shad' },
    ],
    seasons: [
      'Aug–Sep redfish, snook and trout on the flats',
    ],
    accessNotes: [
      'The nearest public access is two Manatee County preserves on Manatee Ave W — Perico Preserve at 11700 and Neal Preserve at 12301. Both open daily, sunrise to sunset, 365 days a year, and both list fishing access.',
      'Neither preserve has a boat ramp or a kayak launch. If you need to launch, the Palma Sola Causeway ramp is a mile and a half north.',
      'Perico has an observation dock, a bird blind, boardwalks and a picnic shelter, but no restrooms. Neal has boardwalks, a 20-foot observation tower and a 0.3-mile shell trail loop, and one portable restroom in the car park.',
      'Neal parks on the south side of Manatee Avenue with overflow parking on the north side of the Anna Maria Island Bridge — crossing SR 64 on foot to fish is not a good plan.',
      'Perico is a designated bird sanctuary: no dogs except service dogs, bikes on designated trails only. Neal allows no pets at all and no bikes on the trails.',
    ],
    sources: [
      {
        id: 'mymanatee-1',
        label: 'Perico Preserve — hours, fishing access, bird-sanctuary rules',
        url: 'https://www.mymanatee.org/connect/locations/location-details/perico-preserve',
        publisher: 'Manatee County Government',
      },
      {
        id: 'mymanatee-2',
        label: 'Neal Preserve — hours, parking, facilities and restrictions',
        url: 'https://www.mymanatee.org/connect/locations/location-details/neal-preserve',
        publisher: 'Manatee County Government',
      },
    ],
  },
  {
    id: 'stump-pass',
    slug: 'stump-pass',
    name: 'Stump Pass',
    region: 'Englewood',
    lat: 26.9111,
    lng: -82.3529,
    access: ['shore', 'kayak'],
    structures: ['pass', 'surf', 'mangrove'],
    station: STATION_ENGLEWOOD,
    tide: 'Moving tide',
    dayparts: ['dawn', 'dusk'],
    targets: [
      { species: 'Snook', rig: 'live bait', hook: '3/0–5/0', leader: '30–40 lb', weight: '0–1/2 oz', bait: 'pilchard' },
      { species: 'Redfish', rig: 'shrimp/weedless', hook: '1/0–3/0', leader: '20–30 lb', weight: 'light', bait: 'shrimp' },
      { species: 'Tarpon', rig: 'live bait', hook: '5/0–8/0', leader: '60–80 lb', weight: 'drift', bait: 'crab/threadfin' },
      // Pass current plus a beach either side of it: ladyfish on the jig in the
      // seam, pompano in the trough on the Gulf side.
      { species: 'Ladyfish', rig: 'jig', hook: '1/4 oz jig', leader: '20 lb', weight: 'jig', bait: 'white jig/small silver spoon' },
      { species: 'Pompano', rig: 'surf rig', hook: '#1–1/0 dropper loops', leader: '20 lb', weight: '2–3 oz pyramid', bait: 'sand flea/fresh shrimp' },
    ],
    seasons: [
      'May–Sep snook in the pass and along the beach',
      'Aug–Nov redfish schooling on the flats inside the pass',
      'Jan–Mar pompano and whiting in the pass and the surf',
      'Jun–Jul tarpon off the beaches outside the pass',
    ],
    accessNotes: [
      'Stump Pass Beach State Park at the south end of Manasota Key, 900 Gulf Blvd, Englewood. Reported open 8 am to sundown daily — not sunrise.',
      'Leashed dogs on the trail, but not on the beach.',
    ],
    safety: [
      'A pass mouth with hard structure either side is where rip currents form. There are no lifeguards here.',
    ],
    sources: [
      {
        id: 'yoursun-1',
        label: 'Stump Pass Beach State Park reopens — hours, fee, temporary restrooms',
        url: 'https://www.yoursun.com/charlotte/news/stump-pass-beach-state-park-reopens/article_f91fac75-0a7d-491d-b4ec-62c551d8d752.html',
        publisher: 'Sun Newspapers (15 September 2025)',
      },
      {
        id: 'floridahikes-2',
        label: 'Stump Pass Beach State Park — trail, new Milton cut, dogs',
        url: 'https://floridahikes.com/stump-pass-beach-state-park/',
        publisher: 'Florida Hikes',
      },
      {
        id: 'weather-3',
        label: 'Rip current science — where rips form and how fast they run',
        url: 'https://www.weather.gov/safety/ripcurrent-science',
        publisher: 'NOAA National Weather Service',
      },
    ],
  },
  {
    id: 'englewood-beach',
    slug: 'englewood-beach',
    name: 'Englewood Beach',
    region: 'Englewood',
    lat: 26.9258,
    lng: -82.3612,
    access: ['shore'],
    structures: ['surf trough', 'cuts'],
    station: STATION_ENGLEWOOD,
    tide: 'Dawn/dusk',
    dayparts: ['dawn', 'dusk'],
    targets: [
      { species: 'Snook', rig: 'free-line', hook: '2/0–4/0', leader: '30–40 lb', weight: 'none', bait: 'pilchard' },
      { species: 'Pompano', rig: 'surf rig', hook: '1/0', leader: '15–20 lb', weight: '1–3 oz', bait: 'sand flea' },
      { species: 'Mackerel', rig: 'spoon', hook: 'single hook', leader: '30–40 lb bite', weight: 'lure', bait: 'spoon' },
    ],
    seasons: [
      'Dec–Mar pompano and whiting in the trough',
      'Jun–Sep snook in the surf',
      'Spanish mackerel along the beach spring and fall',
    ],
    accessNotes: [
      'Englewood Beach at Chadwick Park, 2100 N. Beach Road on Manasota Key. Open 6 am to 9 pm; the county boat ramps and fishing piers keep separate 24-hour access.',
      'Parking is paid — 75 cents an hour, by the ParkMobile app or bought in advance. Passes run $26.75 for three months, $37.45 for six and $53.50 for the year.',
      'Parking is free at any Charlotte County beach, ramp or pier for a vehicle displaying a state handicap plate or placard, provided the permit holder is present.',
      'Restrooms, showers and water stations on site. Beach wheelchairs are self-service seven days a week from 7.30 am and must be back by 3.30 pm — so an evening session cannot use one.',
      'There is no boat ramp or kayak launch at the beach itself; the nearest county launches are Ainger Creek Park and Placida Park.',
    ],
    sources: [
      {
        id: 'charlottecountyfl-1',
        label: 'Englewood Beach at Chadwick Park — parking, amenities, beach wheelchairs',
        url: 'https://www.charlottecountyfl.gov/departments/community-services/parks/all-parks/englewood-beach-at-chadwick-park.stml',
        publisher: 'Charlotte County, Florida',
      },
      {
        id: 'charlottecountyfl-2',
        label: 'Charlotte County park parking — rates, passes and the handicap exemption',
        url: 'https://www.charlottecountyfl.gov/departments/community-services/parks/parking.stml',
        publisher: 'Charlotte County, Florida',
      },
      {
        id: 'charlottecountyfl-3',
        label: 'Charlotte County fishing piers, boat ramps and kayak launches',
        url: 'https://www.charlottecountyfl.gov/departments/community-services/parks/amenities/fishing.stml',
        publisher: 'Charlotte County, Florida',
      },
    ],
  },
  {
    id: 'lemon-bay-mangroves',
    slug: 'lemon-bay-mangroves',
    name: 'Lemon Bay Mangroves',
    region: 'Englewood',
    lat: 26.9562,
    lng: -82.3328,
    access: ['kayak', 'boat'],
    structures: ['points', 'grass', 'drains'],
    station: STATION_ENGLEWOOD,
    tide: 'High incoming/outgoing',
    dayparts: ['dawn'],
    targets: [
      { species: 'Redfish', rig: 'weedless', hook: '3/0–4/0', leader: '20–25 lb', weight: '1/16–1/8 oz', bait: 'paddletail' },
      { species: 'Snook', rig: 'live bait', hook: '2/0–4/0', leader: '30–40 lb', weight: 'light', bait: 'pilchard' },
      { species: 'Snapper', rig: 'free-line', hook: '1/0–2/0', leader: '20–25 lb', weight: 'none', bait: 'shrimp' },
    ],
    seasons: [
      'Redfish under the docks and along the mangroves most of the year',
      'Aug–Nov redfish schooling on the flats',
      'Apr–Sep snook along the mangrove edges and the dock lines',
    ],
    accessNotes: [
      'The bay is reached from public launches rather than from one named site. Indian Mound Park, 210 Winson Ave, Englewood, is the closest — a Sarasota County ramp with docks and restrooms, open 6 am to midnight.',
      'Ainger Creek Park, 2011 Placida Road, is the Charlotte County launch at the south end, with a single-lane ramp, a canoe and kayak launch, restrooms and 24-hour ramp access; parking there is the county 75-cents-an-hour charge.',
      'The fishing piers at Ainger Creek Park are closed.',
    ],
    sources: [
      {
        id: 'charlottecountyfl-1',
        label: 'Ainger Creek Park — ramp, kayak launch, and the closed fishing piers',
        url: 'https://www.charlottecountyfl.gov/departments/community-services/parks/all-parks/ainger-creek-park.stml',
        publisher: 'Charlotte County, Florida',
      },
      {
        id: 'gis-2',
        label: 'Indian Mound Park boat ramp — hours, lanes and facilities',
        url: 'https://gis.myfwc.com/boating_guides/Charlotte_Harbor/pages/boat_ramps/indian_mound/index.html',
        publisher: 'FWC — Boating and Angling Guide to Charlotte Harbor',
      },
      {
        id: 'visitsarasota-3',
        label: 'Lemon Bay Park and Environmental Center — shoreline, launch and facilities',
        url: 'https://www.visitsarasota.com/beaches-parks/lemon-bay-park-and-environmental-center',
        publisher: 'Visit Sarasota County',
      },
    ],
  },
  {
    id: 'placida-gasparilla-sound',
    slug: 'placida-gasparilla-sound',
    name: 'Placida / Gasparilla Sound',
    region: 'Placida',
    lat: 26.833,
    lng: -82.2675,
    access: ['boat', 'kayak'],
    structures: ['mangrove', 'flats', 'docks'],
    station: STATION_PLACIDA,
    tide: 'Moving tide',
    dayparts: ['dawn', 'dusk', 'night'],
    targets: [
      { species: 'Redfish', rig: 'weedless', hook: '3/0–4/0', leader: '20–30 lb', weight: 'light', bait: 'paddletail' },
      { species: 'Snook', rig: 'live bait', hook: '3/0–5/0', leader: '30–50 lb', weight: 'none', bait: 'pilchard' },
      { species: 'Trout', rig: 'popping cork', hook: '1/0–2/0', leader: '15–20 lb', weight: 'light', bait: 'shrimp' },
      // Dock pilings through the sound are the winter sheepshead structure here.
      { species: 'Sheepshead', rig: 'bottom rig', hook: '1–1/0 short shank', leader: '20 lb fluoro', weight: '1/4–1/2 oz', bait: 'fiddler crab/live shrimp' },
    ],
    seasons: [
      'Nov–Mar sheepshead on the trestle, the docks and the oyster bars',
      'Aug–Nov redfish schooling on the sound flats',
      'May–Jun snook staging through the sound for the beaches',
      'Trout on the sound grass most of the year',
    ],
    accessNotes: [
      'Placida Park, 6499 Boca Grande Causeway, is the public launch onto Gasparilla Sound — three launch lanes with boarding piers and around seventy-nine trailer spaces. Park hours are 6 am to 9 pm; the ramp itself is 24 hours.',
      'No launch fee, but every vehicle pays to park between 6 am and 10 pm at the county rate of 75 cents an hour. A yearly parking pass is available, and a state handicap permit parks free.',
      'Restrooms on site; no bait or tackle at the ramp.',
      'Expect a queue. Anglers report waits of about half an hour on busy days, and longer for bigger boats at weekends.',
      'The Placida Rotary Centennial Park fishing pier, an old railroad trestle at CR 775 and Fishery Rd, is free and open 24 hours, but sits about a third of a mile from its parking and the walkway is awkward when wet.',
    ],
    safety: [
      'A busy three-lane ramp with a real queue at weekends. If you fish near it, stay clear of reversing trailers — that end is a working launch, not a fishing platform.',
    ],
    sources: [
      {
        id: 'charlottecountyfl-1',
        label: 'Placida Park — boat ramp, paddling access and facilities',
        url: 'https://www.charlottecountyfl.gov/departments/community-services/parks/all-parks/placida-park.stml',
        publisher: 'Charlotte County, Florida',
      },
      {
        id: 'charlottecountyfl-2',
        label: 'Placida West boat ramp expansion — scope and schedule',
        url: 'https://www.charlottecountyfl.gov/projects/placida-west-boat-ramp-expansion.stml',
        publisher: 'Charlotte County, Florida',
      },
      {
        id: 'gis-3',
        label: 'Placida Rotary Centennial Park fishing pier — access and walkway warning',
        url: 'https://gis.myfwc.com/boating_guides/Charlotte_Harbor/pages/fishing_piers/Placida/index.html',
        publisher: 'FWC — Boating and Angling Guide to Charlotte Harbor',
      },
    ],
  },
  {
    id: 'boca-grande-pass',
    slug: 'boca-grande-pass',
    name: 'Boca Grande Pass',
    region: 'Boca Grande',
    lat: 26.7208,
    lng: -82.2694,
    access: ['boat'],
    structures: ['major pass', 'deep current'],
    station: STATION_BOCA_GRANDE,
    tide: 'Seasonal / current',
    dayparts: ['dusk', 'night'],
    targets: [
      { species: 'Tarpon', rig: 'live crab drift', hook: '5/0–8/0', leader: '60–80 lb', weight: 'depth dependent', bait: 'crab/threadfin' },
      { species: 'Snook', rig: 'live bait', hook: '4/0–5/0', leader: '40–60 lb', weight: '1/2–2 oz', bait: 'pinfish' },
      { species: 'Jack', rig: 'heavy lure', hook: 'single hook', leader: '40–60 lb', weight: 'lure', bait: 'plug/jig' },
    ],
    seasons: [
      'Apr–Jun tarpon through the pass',
      'Apr–Jun snook moving out through the pass',
    ],
    accessNotes: [
      'FWC defines the Boca Grande Pass boundary by six named points, and the gear rules below apply inside it — not to Charlotte Harbor generally.',
    ],
    safety: [
      'Inside the pass, fishing with a weight that hangs lower than the hook is prohibited year-round, for any species. Prohibited jigs must be stowed and not readily accessible — natural bait is exempt.',
      'In April, May and June no vessel may deploy more than three lines at once, and breakaway gear may not be used, fished with or placed in the water.',
      'Tarpon is catch-and-release only. Anything over 40 inches stays in the water unless you are chasing a record with a tarpon tag. Snagging and snatch hooking are prohibited.',
      'Sharks work the pass around hooked tarpon. Stay in the boat.',
      'One of the deepest natural passes in Florida, with hard tide, shifting shoals and heavy boat traffic through the April-to-June peak — the same months the extra gear restrictions apply.',
    ],
    sources: [
      {
        id: 'myfwc-1',
        label: 'Tarpon regulations, including the Boca Grande Pass gear rules and boundary',
        url: 'https://myfwc.com/fishing/saltwater/recreational/tarpon/',
        publisher: 'Florida Fish and Wildlife Conservation Commission',
      },
      {
        id: 'myfwc-2',
        label: 'Tarpon regulation FAQs — snagging, breakaway gear, seasonal rules',
        url: 'https://myfwc.com/fishing/saltwater/recreational/tarpon/faqs/',
        publisher: 'Florida Fish and Wildlife Conservation Commission',
      },
    ],
  },

  /* ------------------------------------------------------------------ *
   * Northern expansion: Sarasota Bay, the Skyway, Fort De Soto and the
   * St. Petersburg / Pinellas shoreline. Every spot below is a named,
   * publicly accessible place with a government or park-authority source
   * on the entry; coordinates come from OpenStreetMap features or the
   * cited park page, not from a guess at where the fish are.
   * ------------------------------------------------------------------ */

  {
    id: 'weedon-island',
    slug: 'weedon-island',
    name: 'Weedon Island Preserve',
    region: 'St. Petersburg',
    lat: 27.8438,
    lng: -82.6113,
    access: ['pier', 'kayak', 'shore'],
    structures: ['mangrove', 'oyster', 'grass', 'drains'],
    // Bay-facing Pinellas shoreline at the mouth of Old Tampa Bay. The Gandy
    // Bridge station is closer in a straight line but sits inside Old Tampa
    // Bay, which runs about an hour behind the main bay — wrong basin.
    station: STATION_ST_PETERSBURG,
    tide: 'Low incoming',
    dayparts: ['dawn', 'dusk'],
    targets: [
      { species: 'Trout', rig: 'popping cork', hook: '1/0–2/0', leader: '15–20 lb', weight: 'light jig', bait: 'live shrimp' },
      { species: 'Snook', rig: 'weedless paddletail', hook: '3/0–4/0', leader: '30–40 lb', weight: '1/16–1/8 oz', bait: 'paddletail/pilchard' },
      { species: 'Sheepshead', rig: 'bottom rig', hook: '1/0 short shank', leader: '20 lb fluoro', weight: '1/4–1/2 oz', bait: 'live shrimp/fiddler crab' },
      // The county's own description of this preserve is oyster bars off the
      // pier — which is black drum ground as much as it is sheepshead ground.
      { species: 'Black drum', rig: 'fish-finder', hook: '2/0–3/0 circle', leader: '25 lb', weight: '1/2–1 oz slider', bait: 'fresh dead shrimp/cut crab' },
    ],
    seasons: [
      'Dec–Mar sheepshead on the pier and bars',
      'Apr–Oct snook along the mangrove edges',
      'Trout on the grass most of the year',
    ],
    accessNotes: [
      'Pinellas County preserve, open daily from 7 am to dusk; admission is free.',
      'The fishing pier and the canoe/kayak launch are both at the end of Weedon Drive NE, off San Martin Blvd.',
      'Two self-guided paddling trails leave from the launch; the county lists the north trail as closed, so check the sign before you plan a loop.',
      'Restrooms on site, but no bait shop and no fish-cleaning table — buy bait before you drive in.',
    ],
    safety: [
      'The oyster bars off the pier are live shell. Hard-soled boots if you get out of the boat, and keep braid off the bar.',
      'The mangrove tunnels on the paddling trail are easy to enter on a high tide and hard to get back out of on a falling one — start the loop with water to spare.',
    ],
    sources: [
      {
        id: 'pinellas-weedon',
        label: 'Weedon Island Preserve — hours, pier, paddling trails',
        url: 'https://pinellas.gov/parks/weedon-island-preserve/',
        publisher: 'Pinellas County Parks & Conservation Resources',
        note: 'Source for the target species listed here: the county names sea trout, snook and sheepshead off the pier and outlying oyster bars.',
      },
      fwcPier('weedon_island', 'Weedon Island fishing pier — facilities and hours'),
      noaaSource(
        STATION_ST_PETERSBURG,
        'Assigned on same-basin logic: Weedon Island faces Tampa Bay proper. Old Tampa Bay stations north of the Gandy causeway run roughly an hour later and should not be used here.',
      ),
    ],
  },
  {
    id: 'st-pete-pier',
    slug: 'st-pete-pier',
    name: 'St. Pete Pier',
    region: 'St. Petersburg',
    lat: 27.7737,
    lng: -82.6228,
    access: ['pier', 'shore'],
    structures: ['pier pilings', 'seawall', 'lights'],
    station: STATION_ST_PETERSBURG,
    tide: 'Moving tide',
    dayparts: ['dusk', 'night'],
    targets: [
      { species: 'Sheepshead', rig: 'bottom rig', hook: '1/0 short shank', leader: '20 lb fluoro', weight: '1/4–1 oz', bait: 'live shrimp/fiddler crab' },
      { species: 'Snapper', rig: 'knocker', hook: '1/0–2/0', leader: '20–30 lb', weight: '1/4–1/2 oz', bait: 'live shrimp/pilchard' },
      { species: 'Jack', rig: 'casting lure', hook: 'single hook', leader: '30–40 lb', weight: 'lure', bait: 'spoon/topwater' },
      // The pier's own seasons note already names mackerel on the bait pushes;
      // the ladyfish are under the deck lights on the same bait, most nights.
      { species: 'Spanish mackerel', rig: 'casting spoon', hook: 'single hook', leader: '30–40 lb bite leader', weight: 'lure', bait: 'silver spoon/white jig' },
      { species: 'Ladyfish', rig: 'jig', hook: '1/4–3/8 oz jig', leader: '20 lb', weight: 'jig', bait: 'white jig worked through the light line' },
    ],
    seasons: [
      'Dec–Mar sheepshead on the pilings',
      'Jun–Sep mangrove snapper after dark',
      'Spanish mackerel and jacks on bait pushes spring and fall',
    ],
    accessNotes: [
      'Fishing is allowed only on the designated Fishing Deck east of the Pier Point building — not from the approach or the rest of the pier.',
      'Posted fishing hours run from about 30 minutes before sunrise to 11 pm daily; the pier changes them, so check its site before a night session.',
      'Walking on is free; parking in the pier district lots is paid. Bait and tackle are sold on site.',
      'Fish-cleaning table and fresh water on the deck; no bait shop is listed in FWC’s entry, so hours can vary.',
    ],
    safety: [
      'The deck sits high over the water. Bring or borrow a drop net — hauling a fish up on the leader breaks it off and drops hooks on whatever is below.',
      'This is a busy public promenade. Cast only from the fishing rail, and keep hooks, knives and bait buckets clear of walkers.',
    ],
    sources: [
      {
        id: 'st-pete-pier-official',
        label: 'St. Pete Pier — official site (fishing deck rules and hours)',
        url: 'https://stpetepier.org/faq/',
        publisher: 'City of St. Petersburg',
      },
      fwcPier('st_pete_pier', 'St. Petersburg Pier — facilities, hours and access'),
      noaaSource(STATION_ST_PETERSBURG, 'Harmonic reference station roughly a mile south of the pier on the same downtown waterfront.'),
    ],
  },
  {
    id: 'pass-a-grille-jetty',
    slug: 'pass-a-grille-jetty',
    name: 'Pass-a-Grille Jetty',
    region: 'St. Pete Beach',
    lat: 27.681,
    lng: -82.7405,
    access: ['shore', 'wade'],
    structures: ['jetty point', 'pass', 'surf trough', 'sandbar cuts'],
    station: STATION_TIERRA_VERDE,
    tide: 'Moving tide, dawn and dusk',
    dayparts: ['dawn', 'dusk', 'night'],
    targets: [
      { species: 'Snook', rig: 'free-line', hook: '2/0–4/0', leader: '30–40 lb', weight: 'none', bait: 'pilchard/live shrimp' },
      { species: 'Pompano', rig: 'surf rig', hook: '1/0', leader: '15–20 lb', weight: '1–3 oz pyramid', bait: 'sand flea/shrimp' },
      { species: 'Spanish mackerel', rig: 'casting spoon', hook: 'single hook', leader: '30–40 lb bite leader', weight: 'lure', bait: 'silver spoon/white jig' },
      // Everything that funnels out of Pass-a-Grille Channel passes the rocks:
      // ladyfish on the seam for anyone learning, jacks on the bait pushes.
      { species: 'Ladyfish', rig: 'jig', hook: '1/4 oz jig', leader: '20 lb', weight: 'jig', bait: 'white jig/small silver spoon' },
      { species: 'Jack crevalle', rig: 'casting lure', hook: 'single inline hooks', leader: '40 lb', weight: 'lure', bait: 'topwater plug/heavy spoon' },
    ],
    seasons: [
      'Sep–Nov and Mar–May pompano along the trough',
      'May–Sep snook on the beach and the jetty rocks',
      'Spanish mackerel on the bait runs spring and fall',
    ],
    accessNotes: [
      'FWC lists the jetty at Gulf Way and 1st Ave, St. Pete Beach — open 24 hours, no entrance fee.',
      'Paid street parking along Gulf Way; it fills early on weekends and in season.',
      'A fish-cleaning table is the only facility at the jetty itself. Merry Pier, on the channel side of Pass-a-Grille, is the nearest bait.',
    ],
    safety: [
      'Pass-a-Grille Channel runs hard on both tides and the water beside the rocks is deep. Do not wade the channel side.',
      'Wet, weeded rock is the real injury risk here. If you go out on it, do it in daylight with grippy soles and both hands free.',
      'Water funnelling out of the pass on the fall sets up a rip alongside the jetty — do not try to swim back against it.',
    ],
    sources: [
      fwcPier('pass-a-grille', 'Pass-a-Grille fishing jetty — location, hours, facilities'),
      noaaSource(STATION_TIERRA_VERDE, 'Same water: the Tierra Verde station sits in the Pass-a-Grille Channel / Bunces Pass system behind the barrier islands.'),
    ],
  },
  {
    id: 'skyway-pier-north',
    slug: 'skyway-pier-north',
    name: 'Skyway Fishing Pier — North',
    region: 'Skyway',
    lat: 27.6363,
    lng: -82.668,
    access: ['pier'],
    structures: ['bridge pilings', 'deep channel', 'lights', 'current seam'],
    // Lower Tampa Bay, near the bay mouth. Mullet Key is the nearest station on
    // the same open channel water; Port Manatee is a similar distance east but
    // sits in a port basin and predicts nearly an hour later.
    station: STATION_MULLET_KEY,
    tide: 'Strong moving tide',
    dayparts: ['dawn', 'dusk', 'night'],
    targets: [
      { species: 'Snapper', rig: 'knocker', hook: '1/0–2/0', leader: '20–30 lb fluoro', weight: '1/4–1 oz', bait: 'live shrimp/pilchard' },
      { species: 'Spanish mackerel', rig: 'casting spoon', hook: 'single hook', leader: '30–40 lb bite leader', weight: 'lure', bait: 'silver spoon/white jig' },
      { species: 'Sheepshead', rig: 'bottom rig', hook: '1/0 short shank', leader: '20 lb fluoro', weight: '1/4–1 oz', bait: 'live shrimp/fiddler crab' },
      { species: 'Tarpon', rig: 'live bait under a float', hook: '5/0–8/0 circle', leader: '60–80 lb', weight: 'float only', bait: 'crab/threadfin/pinfish' },
      // Bridge-scale drum sit on the bottom out of the worst of the current.
      // Enough lead to hold, and a rod you can lift a heavy fish to the net with.
      { species: 'Black drum', rig: 'fish-finder', hook: '4/0–5/0 circle', leader: '40 lb', weight: '3–6 oz slider', bait: 'cut blue crab/dead shrimp' },
    ],
    seasons: [
      'Jun–Sep tarpon through the bay mouth and mangrove snapper at night',
      'Mar–May and Oct–Nov Spanish mackerel and kingfish',
      'Dec–Mar sheepshead tight to the pilings',
    ],
    accessNotes: [
      'A drive-on pier: you pay at the entrance, drive out and park beside your spot on the deck. No RVs, trailers or heavy trucks.',
      'Open 24 hours, with a bait shop, restrooms and a fish-cleaning table on the pier.',
      'Florida State Parks lists a per-vehicle entry fee plus a per-person fishing fee — check the park page for the current amounts and exactly what the fishing fee covers.',
      'This entry is the north (Pinellas) pier only. The south pier was closed beyond its bait shop on 27 Oct 2025 after FDOT structural inspections, and the state announced in March 2026 that it will be replaced rather than repaired.',
    ],
    safety: [
      'Vehicles use the same deck you fish from. Stay inside the marked fishing area and look behind you before you swing a rod.',
      'The rail is a long way above the water — a pier net or drop net is not optional if you want to land anything of size.',
      'Over a mile of open concrete with no shade and no shortcut back: summer lightning and heat are the real hazards here, not the fish.',
    ],
    sources: [
      {
        id: 'fsp-skyway',
        label: 'Skyway Fishing Pier State Park — hours, fees and pier status',
        url: 'https://www.floridastateparks.org/parks-and-trails/skyway-fishing-pier-state-park',
        publisher: 'Florida State Parks (FDEP)',
      },
      fwcPier('Skyway_Pier_North', 'Skyway Fishing Pier State Park, north pier — facilities and restrictions'),
      {
        id: 'south-pier-closure',
        label: 'Part of south Skyway Fishing Pier closed after FDOT inspection (Oct 2025)',
        url: 'https://www.wusf.org/environment/2025-10-24/portion-skyway-south-fishing-pier-closes-due-age-related-structural-concerns',
        publisher: 'WUSF',
        note: 'Basis for treating the north pier as the only currently fishable Skyway pier.',
      },
      noaaSource(
        STATION_MULLET_KEY,
        'Nearest station on the same open lower-bay channel water. Phase at the bridge line runs slightly later than Mullet Key and earlier than Port Manatee, so treat the times as close rather than exact.',
      ),
    ],
  },
  {
    id: 'egmont-key',
    slug: 'egmont-key',
    name: 'Egmont Key',
    region: 'Skyway',
    lat: 27.6008,
    lng: -82.7607,
    access: ['boat', 'shore'],
    structures: ['deep channel', 'sandbar cuts', 'grass', 'surf trough'],
    station: STATION_EGMONT_KEY,
    tide: 'Moving tide',
    dayparts: ['dawn', 'dusk'],
    targets: [
      { species: 'Snook', rig: 'free-line', hook: '3/0–4/0', leader: '30–40 lb', weight: 'none', bait: 'pilchard/threadfin' },
      { species: 'Tarpon', rig: 'live crab', hook: '5/0–8/0 circle', leader: '60–80 lb', weight: 'drift dependent', bait: 'crab/threadfin' },
      { species: 'Snapper', rig: 'knocker', hook: '1/0–2/0', leader: '25–30 lb fluoro', weight: '1/2–1 oz', bait: 'live shrimp/pilchard' },
      // The island's own seasons note already names autumn mackerel off the
      // west side — this is the tackle for them.
      { species: 'Spanish mackerel', rig: 'casting spoon', hook: 'single hook', leader: '40 lb bite leader', weight: 'lure', bait: 'silver spoon/live threadfin' },
    ],
    seasons: [
      'May–Jul tarpon along the channel edge',
      'Jun–Sep snook on the island beaches and the old fort rubble',
      'Oct–Nov mackerel and kingfish off the west side',
    ],
    accessNotes: [
      'Boat access only — private boat, or the seasonal ferry that runs from Fort De Soto. There is no bridge and no dock for a road vehicle.',
      'No restrooms, no drinking water and no shelter beyond the trails. Everything you need comes in with you and goes back out.',
      'Several beaches and the south end are closed year-round as a bird nesting sanctuary, and are posted. Stay out of closed areas.',
      'A prop-exclusion zone protects the seagrass on the east side of the island.',
    ],
    safety: [
      'Egmont Channel is the main deep-water ship entrance to Tampa Bay: heavy commercial traffic, hard tide and a drop-off close to the beach.',
      'There is no help on the island. Carry water, sun cover, a way to call for help and a plan someone ashore knows about.',
    ],
    sources: [
      {
        id: 'fws-egmont',
        label: 'Egmont Key National Wildlife Refuge — activities, fishing and closed areas',
        url: 'https://www.fws.gov/refuge/egmont-key/visit-us/activities',
        publisher: 'U.S. Fish & Wildlife Service',
        note: 'Names seatrout, tarpon, snook, grouper and flounder in the designated fishing areas, and defines the year-round bird closures.',
      },
      {
        id: 'fsp-egmont',
        label: 'Egmont Key State Park — access and visitor information',
        url: 'https://www.floridastateparks.org/parks-and-trails/egmont-key-state-park',
        publisher: 'Florida State Parks (FDEP)',
      },
      noaaSource(STATION_EGMONT_KEY, 'The station sits on the island, in the channel this spot fishes.'),
    ],
  },
  {
    id: 'fort-de-soto-gulf-pier',
    slug: 'fort-de-soto-gulf-pier',
    name: 'Fort De Soto Gulf Pier',
    region: 'Fort De Soto',
    lat: 27.6135,
    lng: -82.7383,
    access: ['pier'],
    structures: ['pier pilings', 'deep channel', 'surf trough'],
    station: STATION_EGMONT_KEY,
    tide: 'Strong moving tide',
    dayparts: ['dawn', 'dusk'],
    targets: [
      { species: 'Spanish mackerel', rig: 'casting spoon', hook: 'single hook', leader: '30–40 lb bite leader', weight: 'lure', bait: 'silver spoon/white jig' },
      { species: 'Kingfish', rig: 'live bait under a float', hook: 'stinger rig', leader: 'short wire bite trace', weight: 'float only', bait: 'live threadfin/blue runner' },
      { species: 'Snapper', rig: 'knocker', hook: '1/0–2/0', leader: '20–30 lb fluoro', weight: '1/2–1 oz', bait: 'live shrimp/pilchard' },
      { species: 'Sheepshead', rig: 'bottom rig', hook: '1/0 short shank', leader: '20 lb fluoro', weight: '1/4–1 oz', bait: 'live shrimp/fiddler crab' },
      // The pier reaches out over the surf line on the Gulf side, so the
      // beach's autumn pompano are in range of a jig off the rail.
      { species: 'Pompano', rig: 'jig', hook: '1/4–3/8 oz pompano jig', leader: '20 lb fluoro', weight: 'jig', bait: 'pink or chartreuse pompano jig' },
    ],
    seasons: [
      'Apr–Jun and Oct–Nov kingfish and Spanish mackerel',
      'Jun–Sep mangrove snapper and passing tarpon',
      'Dec–Mar sheepshead and flounder',
    ],
    accessNotes: [
      'The longer of the park’s two piers, reaching out over the Egmont Channel side of Mullet Key. Bait-and-tackle shop and food concession at the head.',
      'Restrooms, fish-cleaning table, fresh water and monofilament recycling on the pier; it is wheelchair accessible.',
      'Published hours disagree — FWC’s guide lists sunrise to 11 pm, Pinellas County has listed 7 am to sunset since the storm repairs. Check the county page before planning a night session.',
      'Both piers reopened in January 2025 after Hurricanes Helene and Milton. Some park facilities, including boat-ramp docks, were still under repair into 2026.',
      'A park entrance fee applies, and the Pinellas Bayway approach is tolled.',
    ],
    safety: [
      'Mackerel and kingfish tackle means trebles, gaffs and long casts in a crowd. Look behind you and give the person beside you room.',
      'You are fishing over deep, fast water from a high deck — use the pier net rather than lifting a fish on the leader.',
      'Sharks are a normal catch here. Do not lean over the rail to unhook one; cut the leader and let it go.',
    ],
    sources: [
      fwcPier('Fort_DeSoto_Gulf_pier', 'Fort De Soto Gulf Pier — facilities, hours and fees'),
      {
        id: 'pinellas-fort-de-soto',
        label: 'Fort De Soto Park — hours, fees and facility status',
        url: 'https://pinellas.gov/parks/fort-de-soto-park/',
        publisher: 'Pinellas County Parks & Conservation Resources',
      },
      noaaSource(STATION_EGMONT_KEY, 'Same water: the pier fishes the Egmont Channel side of Mullet Key, about a mile and a half from the station.'),
    ],
  },
  {
    id: 'fort-de-soto-bay-pier',
    slug: 'fort-de-soto-bay-pier',
    name: 'Fort De Soto Bay Pier',
    region: 'Fort De Soto',
    lat: 27.616,
    lng: -82.726,
    access: ['pier'],
    structures: ['pier pilings', 'grass', 'sand potholes'],
    station: STATION_MULLET_KEY,
    tide: 'Moving tide',
    dayparts: ['dawn', 'dusk'],
    targets: [
      { species: 'Trout', rig: 'popping cork', hook: '1/0–2/0', leader: '15–20 lb', weight: 'light jig', bait: 'live shrimp' },
      { species: 'Redfish', rig: 'weedless paddletail', hook: '3/0–4/0', leader: '20–25 lb', weight: '1/16–1/8 oz', bait: 'paddletail/cut bait' },
      { species: 'Snook', rig: 'live bait', hook: '3/0–4/0', leader: '30–40 lb', weight: 'light', bait: 'pilchard/pinfish' },
      // The pier's own seasons note names winter sheepshead; the pilings under
      // it are what they are on.
      { species: 'Sheepshead', rig: 'bottom rig', hook: '1/0 short shank', leader: '20 lb fluoro', weight: '1/4–1/2 oz', bait: 'live shrimp/fiddler crab' },
    ],
    seasons: [
      'Trout on the grass most of the year',
      'Apr–Oct snook around the pilings',
      'Dec–Mar sheepshead and flounder off the pier',
    ],
    accessNotes: [
      'The shorter of the two piers and the one on the sheltered Tampa Bay side, so there is less current and the fish are the everyday inshore species rather than the offshore visitors.',
      'Bait and tackle, restrooms, fish-cleaning table and fresh water; wheelchair accessible.',
      'Same hours confusion as the Gulf Pier — FWC lists sunrise to 11 pm, the county has listed 7 am to sunset. Confirm before a night trip.',
      'A park entrance fee applies, and the Pinellas Bayway approach is tolled.',
    ],
    safety: [
      'Shallow, weedy water under a high deck: land fish with the net rather than swinging them, and watch your step on wet planking.',
      'Boat traffic runs close to the pier on its way in and out of the park basin.',
    ],
    sources: [
      fwcPier('Fort_DeSoto_Bay_pier', 'Fort De Soto Bay Pier — facilities, hours and fees'),
      {
        id: 'pinellas-fort-de-soto',
        label: 'Fort De Soto Park — hours, fees and facility status',
        url: 'https://pinellas.gov/parks/fort-de-soto-park/',
        publisher: 'Pinellas County Parks & Conservation Resources',
      },
      noaaSource(STATION_MULLET_KEY, 'The station is about a kilometre from the pier on the same Tampa Bay side of Mullet Key.'),
    ],
  },
  {
    id: 'bunces-pass-shell-key',
    slug: 'bunces-pass-shell-key',
    name: 'Bunces Pass / Shell Key',
    region: 'Fort De Soto',
    lat: 27.6501,
    lng: -82.7392,
    access: ['kayak', 'boat', 'wade'],
    structures: ['pass', 'sandbar cuts', 'grass', 'sand potholes', 'mangrove'],
    station: STATION_TIERRA_VERDE,
    tide: 'Low incoming',
    dayparts: ['dawn', 'dusk'],
    targets: [
      { species: 'Redfish', rig: 'weedless paddletail', hook: '3/0–4/0', leader: '20–25 lb', weight: '1/16–1/8 oz', bait: 'paddletail/cut bait' },
      { species: 'Trout', rig: 'popping cork', hook: '1/0–2/0', leader: '15–20 lb', weight: 'light jig', bait: 'live shrimp' },
      { species: 'Snook', rig: 'free-line', hook: '2/0–4/0', leader: '30–40 lb', weight: 'none', bait: 'pilchard' },
      // The spot's own seasons note names autumn pompano and mackerel through
      // the pass; both are jig-and-spoon fish from the bar edges on the fall.
      { species: 'Pompano', rig: 'jig', hook: '1/4 oz pompano jig', leader: '20 lb', weight: 'jig', bait: 'pink pompano jig/sand flea' },
      { species: 'Spanish mackerel', rig: 'casting spoon', hook: 'single hook', leader: '30–40 lb bite leader', weight: 'lure', bait: 'silver spoon' },
    ],
    seasons: [
      'Apr–Oct snook in and around the pass',
      'Redfish on the east-side flats most of the year',
      'Sep–Nov pompano and mackerel through the pass',
    ],
    accessNotes: [
      'Boat or paddle only — there is no road to Shell Key. Common access is the Pinellas Bayway kayak/SUP launch on Tierra Verde, the Fort De Soto boat ramp, or the ferry that runs from that ramp.',
      'The middle of Shell Key is a Bird Preservation Area and is closed to entry. Landing is only allowed in the marked public use areas.',
      'Overnight camping is restricted to the southern public use area and needs a Pinellas County permit.',
      'No restrooms, no water and no shade on the key.',
    ],
    safety: [
      'Bunces Pass carries strong tide and shifting sandbars either side of the mouth. The Gulf entrance is the roughest way in or out.',
      'Crossing the pass in a kayak is an open-water crossing with boat traffic — check wind against tide before you commit, not after.',
      'Wade the flats with a shuffling step; rays bury on the sand between the grass.',
    ],
    sources: [
      {
        id: 'pinellas-shell-key',
        label: 'Shell Key Preserve — access, closed bird areas and rules',
        url: 'https://pinellas.gov/parks/shell-key-preserve/',
        publisher: 'Pinellas County Parks & Conservation Resources',
      },
      {
        id: 'shell-key-launch',
        label: 'Where to launch a kayak to Shell Key',
        url: 'https://shellkey.org/where-to-launch-a-kayak-to-shell-key',
        publisher: 'Friends of Shell Key',
        note: 'Community source, used only for launch logistics and the local read on Bunces Pass — not for regulations.',
      },
      noaaSource(STATION_TIERRA_VERDE, 'Same water: the station sits in the Pass-a-Grille Channel / Bunces Pass system a couple of miles north.'),
    ],
  },
  {
    id: 'new-pass-ken-thompson',
    slug: 'new-pass-ken-thompson',
    name: 'New Pass / Ken Thompson Park',
    region: 'Sarasota',
    lat: 27.3351,
    lng: -82.575,
    access: ['shore', 'kayak', 'boat'],
    structures: ['pass', 'seawall', 'docks', 'grass'],
    station: STATION_LONGBOAT_KEY,
    tide: 'Moving tide',
    dayparts: ['dawn', 'dusk', 'night'],
    targets: [
      { species: 'Snook', rig: 'live bait', hook: '2/0–4/0', leader: '30–40 lb', weight: '0–1/2 oz', bait: 'pilchard/live shrimp' },
      { species: 'Snapper', rig: 'knocker', hook: '1/0–2/0', leader: '20–25 lb fluoro', weight: '1/4–1/2 oz', bait: 'live shrimp' },
      { species: 'Sheepshead', rig: 'bottom rig', hook: '1/0 short shank', leader: '20 lb fluoro', weight: '1/4–1/2 oz', bait: 'live shrimp/fiddler crab' },
      // Shoreline access on a narrow, hard-running pass with lights on it: a
      // first-fish spot after dark, and a jack spot when the bait gets pinned.
      { species: 'Ladyfish', rig: 'jig', hook: '1/8–1/4 oz jig', leader: '20 lb', weight: 'jig', bait: 'white jig/live shrimp' },
      { species: 'Jack crevalle', rig: 'casting lure', hook: 'single inline hooks', leader: '40–50 lb', weight: 'lure', bait: 'topwater plug/live pilchard' },
    ],
    seasons: [
      'Apr–Oct snook on the pass edges',
      'Jun–Sep mangrove snapper around the structure',
      'Dec–Mar sheepshead on the seawall and pilings',
    ],
    accessNotes: [
      'City of Sarasota park on City Island, between Lido Key and Longboat Key, with shoreline access along New Pass. Open during posted daily park hours.',
      'Three-lane boat ramp, kayak launch, restrooms and picnic area. Trailer parking is the busiest in the city and fills early on weekends.',
    ],
    safety: [
      'New Pass is narrow, busy and carries real current. Expect constant boat traffic in the channel, wake against the shoreline and a fast drop-off.',
      'If you fish near the ramp, watch for reversing trailers — that end of the park is a working launch, not a fishing platform.',
    ],
    sources: [
      {
        id: 'sarasota-ken-thompson',
        label: 'Ken Thompson Park — hours, ramp and facilities',
        url: 'https://www.letsplaysarasota.com/parks/ken-thompson-park',
        publisher: 'City of Sarasota Parks and Recreation',
      },
      noaaSource(STATION_LONGBOAT_KEY, 'Same water: the station is on the Sarasota Bay side just north of New Pass. The Sarasota city-front station is further from the pass and less representative of it.'),
    ],
  },
  {
    id: 'south-lido-park',
    slug: 'south-lido-park',
    name: 'South Lido Park / Big Sarasota Pass',
    region: 'Sarasota',
    lat: 27.3036,
    lng: -82.5678,
    access: ['shore', 'kayak', 'wade'],
    structures: ['pass', 'grass', 'mangrove', 'surf trough', 'sand potholes'],
    station: STATION_BIG_SARASOTA_PASS,
    tide: 'Moving tide',
    dayparts: ['dawn', 'dusk'],
    targets: [
      { species: 'Snook', rig: 'free-line', hook: '2/0–4/0', leader: '30–40 lb', weight: 'none', bait: 'pilchard/live shrimp' },
      { species: 'Redfish', rig: 'weedless paddletail', hook: '3/0–4/0', leader: '20–25 lb', weight: '1/16–1/8 oz', bait: 'paddletail/cut bait' },
      { species: 'Trout', rig: 'popping cork', hook: '1/0–2/0', leader: '15–20 lb', weight: 'light jig', bait: 'live shrimp' },
      // The spot's own seasons note names autumn pompano and mackerel off the
      // pass beach: pompano in the trough, mackerel on the outside of it.
      { species: 'Pompano', rig: 'surf rig', hook: '#1–1/0 dropper loops', leader: '20 lb', weight: '1–3 oz pyramid', bait: 'sand flea/fresh shrimp' },
      { species: 'Spanish mackerel', rig: 'casting spoon', hook: 'single hook', leader: '30–40 lb bite leader', weight: 'lure', bait: 'silver spoon/white jig' },
    ],
    seasons: [
      'May–Sep snook along the pass and the beach cuts',
      'Redfish and trout on the bay-side grass most of the year',
      'Sep–Nov pompano and mackerel off the pass beach',
    ],
    accessNotes: [
      'Sarasota County park (Ted Sperling Park) at the south end of Lido Key, wrapping the Gulf, Big Pass, Sarasota Bay and Bushy Bayou. Parking is free.',
      'Restrooms, shaded picnic areas, nature trails and a canoe/kayak launch into the mangrove trail.',
      'Big Pass is posted no-swimming because of the current — treat it as fishing and paddling access, not a swimming beach.',
    ],
    safety: [
      'Big Sarasota Pass runs hard, particularly on the northwest side, and the bottom drops away close to the beach.',
      'The mangrove canoe trail is a maze at high water and can leave you aground at low. Know the stage before you paddle in.',
      'Shuffle your feet on the sand flats and in the potholes — rays bury there.',
    ],
    sources: [
      {
        id: 'sarasota-ted-sperling',
        label: 'Ted Sperling Park at South Lido Beach — facilities and access',
        url: 'https://www.sarasotacountyparks.com/Home/Components/FacilityDirectory/FacilityDirectory/853/6738',
        publisher: 'Sarasota County Parks, Recreation and Natural Resources',
      },
      {
        id: 'visit-sarasota-south-lido',
        label: 'Ted Sperling Park at South Lido Beach — visitor guide',
        url: 'https://www.visitsarasota.com/beaches-parks/ted-sperling-park-south-lido-beach',
        publisher: 'Visit Sarasota County',
      },
      noaaSource(STATION_BIG_SARASOTA_PASS, 'The station is in Big Sarasota Pass itself, on the Siesta Key side of the same inlet this spot fishes.'),
    ],
  },
];

export const LOCATIONS: Location[] = RAW.map((s) => ({
  id: s.id,
  slug: s.slug,
  name: s.name,
  region: s.region,
  lat: s.lat,
  lng: s.lng,
  access: s.access,
  structures: s.structures,
  tide_station: s.station,
  seasons: s.seasons ?? [],
  dayparts: s.dayparts ?? [],
  tide_playbook: playbook(s.structures, s.tide),
  targets: targets(s.targets),
  // Deliberately empty everywhere: the page renders a live satellite map for
  // the spot rather than a stock photo of a shoreline that is not this one.
  images: [],
  safety: s.safety ?? [],
  access_notes: s.accessNotes ?? [],
  sources: s.sources ?? [],
}));

export const locationBySlug = (slug: string): Location | undefined =>
  LOCATIONS.find((l) => l.slug === slug);

/** North to south, which is how the "spots by area" list reads on Home. */
export const REGIONS: Region[] = [
  'St. Petersburg',
  'St. Pete Beach',
  'Skyway',
  'Fort De Soto',
  'Bradenton',
  'Anna Maria',
  'Sarasota',
  'Englewood',
  'Placida',
  'Boca Grande',
];

export const ACCESS_TYPES: AccessType[] = [
  'shore',
  'kayak',
  'boat',
  'pier',
  'wade',
  'bridge',
];
