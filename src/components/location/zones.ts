/**
 * Numbered casting zones — the join key of the whole location page.
 *
 * The design boards use one numbering convention across three places: the
 * structure diagram, the four tide stages and the cast line of every species
 * card. This module derives that numbering from a location's real
 * `structures` array, so it works for all 25 spots without anyone
 * inventing location-specific facts.
 *
 * HONESTY CONTRACT
 * - A zone only exists because a structure string in the data produced it
 *   (`sources` keeps the original strings).
 * - `look` and `cast` are *general* structure tactics — how anyone fishes an
 *   oyster bar, a bridge piling, a pothole — never a claim about this
 *   particular shoreline. The location page states that plainly in the
 *   mandatory "local heuristics" callout.
 * - The diagram anchors are a schematic arrangement, not a survey. The page
 *   says so next to the drawing and points at the real satellite map.
 */
import type { Location, TargetRecipe, TideStage } from '../../data';

export type ZoneKind =
  | 'mangrove'
  | 'point'
  | 'grass'
  | 'potholes'
  | 'flat'
  | 'oyster'
  | 'drain'
  | 'pass'
  | 'cut'
  | 'channel'
  | 'bridge'
  | 'lights'
  | 'dock'
  | 'seawall'
  | 'surf'
  | 'seam';

export interface Zone {
  /** 1-based number shown in the diagram, tide stages and species cards. */
  n: number;
  kind: ZoneKind;
  /** The structure strings from the location data that produced this zone. */
  sources: string[];
  title: string;
  /** What the feature looks like on the water. General, not spot-specific. */
  look: string;
  /** General tactic for this structure type. */
  cast: string;
  /** Habitat module id, when the guide has a full "read the water" entry. */
  habitatId: string | null;
  /** Tide stages when this kind of structure typically fishes best. */
  stages: TideStage[];
  /** Schematic anchor in the 390x300 diagram viewBox. */
  anchor: { x: number; y: number };
}

interface ZoneSpec extends Omit<Zone, 'n' | 'sources'> {}

const SPECS: Record<ZoneKind, ZoneSpec> = {
  mangrove: {
    kind: 'mangrove',
    title: 'Mangrove root line',
    look: 'A shoreline of tangled prop roots. The productive stretches have depth close in, bait working the edge, and a corner or cut rather than a flat straight wall.',
    cast: 'On the flood, put the bait tight to the roots and let it swim out. On the fall, sit off the edge and fish what the water pulls out of them.',
    habitatId: 'mangrove',
    stages: ['incoming', 'high'],
    anchor: { x: 56, y: 96 },
  },
  point: {
    kind: 'point',
    title: 'Point tip',
    look: 'A corner of shoreline pushing into moving water. Current splits around it on every stage, which is why it is worth the first cast of the session.',
    cast: 'Cast up-current of the tip so the bait swings naturally into the seam behind it. Fish it before you walk past it.',
    habitatId: 'mangrove',
    stages: ['incoming', 'outgoing'],
    anchor: { x: 150, y: 104 },
  },
  grass: {
    kind: 'grass',
    title: 'Grass edge',
    look: 'Dark green or brown bottom. The edge — where the grass stops and sand or deeper water starts — is the part that matters.',
    cast: 'Work the outside edge first, then follow the water inside as it floods. Keep the retrieve parallel to the edge rather than across it.',
    habitatId: 'grass',
    stages: ['incoming', 'high'],
    anchor: { x: 92, y: 196 },
  },
  potholes: {
    kind: 'potholes',
    title: 'Sand potholes',
    look: 'Pale circles and irregular patches inside the dark grass. Easiest to find on a satellite view before you go.',
    cast: 'Land the cast beyond the pale sand and bring it back across the light–dark boundary. Fish sit on the edge, not in the middle.',
    habitatId: 'grass',
    stages: ['low', 'incoming'],
    anchor: { x: 196, y: 168 },
  },
  flat: {
    kind: 'flat',
    title: 'Open flat',
    look: 'Wide shallow water with no single obvious feature. Colour changes, bait sign and any edge you can find are what break it up.',
    cast: 'Cover water quietly and keep moving until something shows. Long casts, and stay off the fish you are trying to reach.',
    habitatId: 'grass',
    stages: ['incoming', 'high'],
    anchor: { x: 250, y: 200 },
  },
  oyster: {
    kind: 'oyster',
    title: 'Oyster bar',
    look: 'A raised rough shell ridge, often exposed at low water and marked by ripples or nervous water when it is covered.',
    cast: 'Cast past the down-current tip and swim the lure back across the shell edge — never drag it into the shell. Keep braid off the bar.',
    habitatId: 'oyster',
    stages: ['incoming', 'outgoing'],
    anchor: { x: 176, y: 250 },
  },
  drain: {
    kind: 'drain',
    title: 'Drain mouth',
    look: 'A cut or creek mouth where a flat empties. On a falling tide it runs like a small river and concentrates everything leaving the shallows.',
    cast: 'Sit down-current of the mouth on the fall and let the water deliver bait to you. Do not stand in the drain you are fishing.',
    habitatId: null,
    stages: ['outgoing', 'low'],
    anchor: { x: 44, y: 138 },
  },
  pass: {
    kind: 'pass',
    title: 'Pass',
    look: 'A narrow Gulf-to-bay opening with rips, foam lines, sandbar tips, colour changes and eddies. The current here is the whole story.',
    cast: 'Fish the seams and edges rather than the fastest water in the middle. Use the least weight that still holds your zone.',
    habitatId: 'pass',
    stages: ['incoming', 'outgoing'],
    anchor: { x: 312, y: 108 },
  },
  cut: {
    kind: 'cut',
    title: 'Bar cut',
    look: 'A gap in an otherwise continuous sandbar. Water funnels through it, so it is a doorway rather than a wall.',
    cast: 'Fish the down-current lip as water funnels through. Let the bait wash through the gap rather than dragging it against the flow.',
    habitatId: 'pass',
    stages: ['outgoing', 'incoming'],
    anchor: { x: 300, y: 252 },
  },
  channel: {
    kind: 'channel',
    title: 'Channel edge',
    look: 'The drop from shallow into the deep cut. On a chart or a satellite view it is the hard colour change; on the water it is often a current line.',
    cast: 'Fish the up-current face of the edge and let the bait drop along the break. Deeper is not automatically better — the edge is the target.',
    habitatId: 'pass',
    stages: ['low', 'outgoing'],
    anchor: { x: 344, y: 244 },
  },
  bridge: {
    kind: 'bridge',
    title: 'Bridge pilings',
    look: 'Current splits around each piling and leaves a slack pocket behind it. The bigger the tide, the harder the edge.',
    cast: 'Cast up-current so the bait drifts naturally past the piling. Keep the rod low and steer the fish out, away from the concrete.',
    habitatId: 'bridge',
    stages: ['incoming', 'outgoing'],
    anchor: { x: 245, y: 151 },
  },
  lights: {
    kind: 'lights',
    title: 'Light line',
    look: 'After dark, dock or bridge lights draw bait and cut a sharp bright/dark edge in the water. Fish hold on the dark side and face the current.',
    cast: 'Work the dark side of the line and let the bait drift from dark into light. Do not cast into the middle of the bright patch.',
    habitatId: 'bridge',
    stages: ['incoming', 'outgoing'],
    anchor: { x: 110, y: 214 },
  },
  dock: {
    kind: 'dock',
    title: 'Dock line',
    look: 'Shade, pilings and often deeper water held right against the structure. The corners and the shadow line hold more than the open middle.',
    cast: 'Skip the bait into the shade line and let it sink on a slack line. Fish the up-current corner first.',
    habitatId: 'bridge',
    stages: ['high', 'incoming'],
    anchor: { x: 344, y: 62 },
  },
  seawall: {
    kind: 'seawall',
    title: 'Seawall edge',
    look: 'A hard vertical edge with current running along it. Corners, steps, outflows and any piling break up the wall and hold fish.',
    cast: 'Work parallel to the wall about a rod length off it, and slow down at every corner and break.',
    habitatId: null,
    stages: ['incoming', 'high'],
    anchor: { x: 230, y: 52 },
  },
  surf: {
    kind: 'surf',
    title: 'Surf trough',
    look: 'The deeper slot between the beach and the first sandbar. Waves break on the bar, roll through the trough and break again at your feet.',
    cast: 'Fan-cast the trough parallel to the beach before you wade out into the water you were about to fish.',
    habitatId: null,
    stages: ['incoming', 'high'],
    anchor: { x: 206, y: 244 },
  },
  seam: {
    kind: 'seam',
    title: 'Current seam',
    look: 'The line where moving water meets slower water — visible as a foam line, a colour change or a ripple edge.',
    cast: 'Cast into the slower side and swim the lure across into the moving water. The eat usually comes on the crossing.',
    habitatId: 'pass',
    stages: ['incoming', 'outgoing'],
    anchor: { x: 150, y: 244 },
  },
};

/**
 * Structure-string matchers, most specific first. Order matters:
 * "deep current" must reach `channel` before the bare `current` -> `seam`
 * rule, and "surf cuts" must reach `cut` before `surf`.
 */
const MATCHERS: Array<[RegExp, ZoneKind]> = [
  [/light/, 'lights'],
  [/bridge|piling/, 'bridge'],
  [/deep current|channel/, 'channel'],
  [/pass/, 'pass'],
  [/cut/, 'cut'],
  [/surf|trough/, 'surf'],
  [/mangrove/, 'mangrove'],
  [/point/, 'point'],
  [/pothole/, 'potholes'],
  [/grass/, 'grass'],
  [/oyster|shell/, 'oyster'],
  [/drain/, 'drain'],
  [/dock/, 'dock'],
  [/seawall/, 'seawall'],
  [/flat/, 'flat'],
  [/current|seam/, 'seam'],
];

function kindOf(structure: string): ZoneKind | null {
  const s = structure.toLowerCase();
  for (const [re, kind] of MATCHERS) if (re.test(s)) return kind;
  return null;
}

/**
 * Numbered zones for a location, in the order its structures are listed.
 * Two structure strings that resolve to the same kind are merged into one
 * zone (both strings are kept in `sources`) — one feature, one number.
 */
export function zonesFor(loc: Location): Zone[] {
  const order: ZoneKind[] = [];
  const sources = new Map<ZoneKind, string[]>();

  for (const structure of loc.structures) {
    const kind = kindOf(structure);
    if (!kind) continue;
    if (!sources.has(kind)) {
      order.push(kind);
      sources.set(kind, []);
    }
    sources.get(kind)!.push(structure);
  }

  return order.map((kind, i) => ({
    ...SPECS[kind],
    n: i + 1,
    sources: sources.get(kind) ?? [],
  }));
}

/** Zones that this tide stage tends to favour, for the four-stage timeline. */
export function zonesForStage(zones: Zone[], stage: TideStage): Zone[] {
  return zones.filter((z) => z.stages.includes(stage));
}

/**
 * Which zone a species works at THIS location — from the researched recipe
 * only, never inferred.
 *
 * This used to guess. A hand-written SPECIES_PREFERENCE table ordered the
 * structure kinds each species "prefers", the first kind present won, and when
 * the species was not in the table the function returned `zones[0]` — whichever
 * structure happened to sit at index 0 of the location's array. Seven of the
 * 104 recipes resolved that way, and the other 97 came from the uncited table.
 *
 * Either way the result rendered in `TargetRecipe` as an unhedged imperative
 * ("Point tip. Cast up-current of the tip...") in the same visual register as
 * the researched tackle beside it. A structure tactic stated generally is
 * honest — that is what `look` and `cast` are, and the page discloses it. But
 * "this species works that structure at this spot" is a species-by-location
 * claim, and CLAUDE.md is unambiguous: no spot advice from general knowledge,
 * and an unresearched field stays empty.
 *
 * So the join key is now `recipe.cast_zone`, the field the schema already
 * reserved for it (`data/types.ts:136`). No recipe populates it yet, so no cast
 * line renders today — `TargetRecipe` guards on null and simply omits it. When
 * research fills `cast_zone`, the line comes back, sourced.
 *
 * `zones.test.ts` fails if this function ever returns a zone for a recipe with
 * no `cast_zone`, which is what stops the inference growing back.
 */
export function zoneForTarget(zones: Zone[], target: TargetRecipe): Zone | null {
  const wanted = target.cast_zone?.trim().toLowerCase();
  if (!wanted || zones.length === 0) return null;

  return (
    zones.find(
      (z) =>
        z.kind === wanted ||
        z.title.toLowerCase() === wanted ||
        z.sources.some((s) => s.toLowerCase() === wanted),
    ) ?? null
  );
}
