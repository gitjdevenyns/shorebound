/**
 * Shorebound content schema — follows the location/target-recipe recommendation in
 * GCF-Claude-Code-Handoff/docs/ARCHITECTURE.md.
 *
 * Fields that the v6 data did not contain (seasons, dayparts, access_notes,
 * per-location sources/images, most per-target recipe details) are typed but
 * left empty rather than invented; other tracks are researching them.
 */

export type AccessType = 'shore' | 'kayak' | 'boat' | 'pier' | 'wade' | 'bridge';

/**
 * Simple place names, ordered north to south in `REGIONS` (locations.ts).
 * The Tampa Bay / Pinellas names were added when the guide was extended north
 * and west of the original Manatee-to-Boca-Grande footprint.
 */
export type Region =
  | 'St. Petersburg'
  | 'St. Pete Beach'
  | 'Skyway'
  | 'Fort De Soto'
  | 'Bradenton'
  | 'Anna Maria'
  | 'Sarasota'
  | 'Englewood'
  | 'Placida'
  | 'Boca Grande';

export interface SourceRef {
  id: string;
  label: string;
  url: string;
  publisher?: string;
  note?: string;
}

/** External media reference (v6 hotlinks — flagged for provenance work). */
export interface MediaRef {
  url: string;
  alt: string;
  /** Page documenting/attributing the media, when known. */
  source_url?: string;
  license?: string;
}

export interface FishHandling {
  dos: string[];
  donts: string[];
  /** Angler-safety hazard note (teeth, gill plates, spines...). */
  angler: string;
}

export interface Fish {
  id: string;
  name: string;
  images: MediaRef[];
  habitat: string;
  /** Rod / reel / main line summary, e.g. "7–7'6 MH • 4000–5000 • 20–30 lb braid". */
  gear: string;
  leader: string;
  hook: string;
  bait: string;
  landing_tool: string;
  handling: FishHandling;
}

export interface Hazard {
  id: string;
  name: string;
  image: MediaRef | null;
  /** Full hazard description. */
  risk: string;
  /** Short card-level risk label, where the v6 data had one. */
  risk_short?: string;
  handle: string;
  injury_media: MediaRef[];
}

export interface Habitat {
  id: string;
  name: string;
  /** Local annotated SVG diagram path (relative to the site base). */
  diagram: string;
  photos: MediaRef[];
  look: string;
  fish: string;
  how: string;
}

export interface Rig {
  id: string;
  name: string;
  /** Text schematic, e.g. "BRAID ━ LEADER ━ CIRCLE HOOK ━ LIVE BAIT". */
  schematic: string;
  use: string;
}

export interface VideoLink {
  title: string;
  url: string;
}

export type TideStage = 'low' | 'incoming' | 'high' | 'outgoing';

export interface TidePlaybook {
  low: string;
  incoming: string;
  high: string;
  outgoing: string;
  /** Which stages the v6 heuristic considered prime windows here. */
  prime_stages: TideStage[];
  /** The original one-line v6 recommendation, e.g. "Low incoming". */
  best_window: string;
}

export interface TargetRecipe {
  /** Fish id when the species has a full guide entry, else null. */
  species_id: string | null;
  /** Display name (covers species without a guide entry: pompano, jack...). */
  species_label: string;
  /** 1 = primary target at this location. */
  priority: number;
  rig_id: string | null;
  /** Free-text rig description from v6 (kept verbatim). */
  rig: string;
  hook: string;
  leader: string;
  weight: string;
  bait: string;
  /* Typed-but-not-yet-researched recipe fields (ARCHITECTURE.md schema). */
  rod?: string;
  reel?: string;
  main_line?: string;
  lures?: string[];
  presentation?: string;
  cast_zone?: string;
  landing_tool?: string;
  release_notes?: string;
}

export interface TideStationRef {
  /** NOAA station id, e.g. "8726247"; null while station research is pending. */
  noaa_id: string | null;
  name?: string;
  url?: string;
}

export interface Location {
  id: string;
  slug: string;
  name: string;
  region: Region;
  lat: number;
  lng: number;
  access: AccessType[];
  structures: string[];
  tide_station: TideStationRef;
  /** Best months/seasons — pending research; empty means "not documented yet". */
  seasons: string[];
  /** dawn/day/dusk/night notes — v6 only had these for a few spots. */
  dayparts: string[];
  tide_playbook: TidePlaybook;
  targets: TargetRecipe[];
  images: MediaRef[];
  safety: string[];
  access_notes: string[];
  sources: SourceRef[];
}

export interface TidePrinciple {
  title: string;
  body: string;
}

export interface TideStationPage {
  area: string;
  name: string;
  url: string;
}

export interface TideGuide {
  principles: TidePrinciple[];
  stations: TideStationPage[];
}
