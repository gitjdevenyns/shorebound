/**
 * First-pass triage of the review queue.
 *
 * 249 items is too many to read one at a time, so this applies stated rules to
 * the bulk and records an explicit, individually-reasoned decision for the
 * twenty `alert` items — the ones where the guide is currently telling readers
 * something wrong, and where a rule would be the wrong instrument.
 *
 * Every decision is written to docs/REVIEW_DECISIONS.md with its reason, and
 * seeded into src/admin/data/review-seed.json so the console shows this pass
 * as already-reviewed rather than making the owner start from zero.
 *
 * Nothing here is final. The owner overturns anything by changing it in the
 * console; these are defaults, not verdicts.
 */
import ITEMS from '../src/admin/data/review-items.json' with { type: 'json' };
import { writeFileSync } from 'node:fs';

/* ------------------------------------------------------------------ rules */

const RULES = [
  {
    when: (i) => i.kind === 'shop',
    status: 'skipped',
    why: 'Superseded — the researched shop now lives in src/data/shops.ts and is managed in the Bait & tackle tab, where it has an include toggle and a listing tier. Keeping a duplicate here would mean two places to change one fact.',
  },
  {
    when: (i) => i.confidence === 'insufficient',
    status: 'skipped',
    why: 'No checkable source. The guide\'s rule is that an unresearched field stays empty — empty means "not done yet", and that is a more useful thing to show a reader than a plausible sentence nobody verified.',
  },
  {
    when: (i) => i.kind === 'source',
    status: 'accepted',
    why: 'A citation attached to a spot. Pure upside: it makes an existing claim checkable and adds nothing new to verify.',
  },
  {
    when: (i) => i.confidence === 'medium' && i.time_sensitive,
    status: 'needs_info',
    why: 'A secondary source on a claim that goes stale — hours, fees, construction. Not wrong, but not something to put in front of a reader without a call or a look.',
  },
  {
    when: (i) => i.confidence === 'high',
    status: 'accepted',
    why: 'Official or first-party source, quoted. This is the bar the guide already holds its existing content to.',
  },
  {
    when: (i) => i.confidence === 'medium',
    status: 'accepted',
    why: 'A credible secondary source with nothing official contradicting it, on a claim that does not go stale.',
  },
];

/* ---------------------------------------------- individual alert decisions */

const ALERTS = {
  'alert:emerson-point:01': ['accepted', 'accessNotes',
    'The county says the dock is closed until further notice and the guide sends people there for shore and kayak access. This is the single most important item in the queue.'],
  'alert:green-bridge:01': ['accepted', 'DATA_FIX',
    'The coordinates in locations.ts point at the wrong bank. The pier is the surviving 1927 span on the Palmetto side. A wrong pin sends someone to the opposite shore of a river.'],
  'alert:bridge-street-pier:01': ['accepted', 'accessNotes',
    'Part of the pier is still closed and the guide types this spot as pier access. Sourced to the county funding agreement.'],
  'alert:coquina-beach:01': ['accepted', 'accessNotes',
    'Renourishment starts within months of now and runs through the season. Official, funded, dated.'],
  'alert:bean-point:01': ['needs_info', null,
    'A parking study, not an enacted rate. Publishing $4.50/hour before the vote would be stating a proposal as fact. Re-check after the 31 Aug 2026 meeting.'],
  'alert:cortez-bridge:01': ['accepted', 'accessNotes',
    'A 1,200-day FDOT construction project in the channel either side of the span. The guide describes fishing the pilings; that description is now questionable for years.'],
  'alert:stump-pass:01': ['accepted', 'accessNotes',
    'Milton cut a new pass through the trail. The guide implies a walk to the tip that no longer exists as one beach. Medium confidence, but the change is physical and well attested.'],
  'alert:englewood-beach:01': ['needs_info', null,
    'The research itself says verify. County pier status after the storms is exactly the kind of claim that must not be guessed.'],
  'alert:lemon-bay-mangroves:01': ['needs_info', null,
    'Last reported closed in March 2025 and the county sites 403 to automated checks. "Probably still closed eighteen months later" is not something to publish.'],
  'alert:placida-gasparilla-sound:01': ['accepted', 'accessNotes',
    'Dated, funded, scoped public works with a defined window. Useful for anyone planning ahead.'],
  'alert:emerson-point:02': ['accepted', 'accessNotes',
    'Published first-person observation from a named local columnist about seagrass loss. Accepted as an attributed quote, never as the guide\'s own claim about the water.'],
  'alert:palma-sola-bay:01': ['needs_info', null,
    'This is a fishing REGULATION. The rule dates to 2021 and the research says re-check it against FWC. The guide states plainly that regulations are verified before being presented as legal guidance — getting this wrong could cost a reader a citation.'],
  'alert:south-palma-sola-flats:01': ['skipped', null,
    '"People can be seen wading here" is an observation from a source document, not usable guide content. It tells a reader nothing they cannot see for themselves.'],
  'alert:annies-bait-and-tackle:01': ['skipped', null,
    'Handled in the directory instead: Annie\'s is correctly absent from src/data/shops.ts and the live-site trap is recorded in the research file. Nothing to add to a location page.'],
  'alert:seafood-shack-marina:01': ['skipped', null,
    'Shop data, already handled by its absence from the directory.'],
  'alert:GUIDE:anna-maria-city-pier': ['skipped', null,
    'Anna Maria City Pier is not one of the guide\'s 25 spots, so nothing in the app is currently wrong about it. Worth revisiting if it is added after the late-2026 reopening.'],
  'alert:GUIDE:rod-and-reel-pier': ['skipped', null,
    'Not a spot in the guide. Same reasoning as the City Pier.'],
  'alert:GUIDE:cortez-bait-cluster': ['accepted', 'CLUSTER_BAIT',
    'The strongest piece of practical content in the whole queue: since Annie\'s went, this cluster has no easy bait stop. That is precisely the "buy bait before you drive in" note Weedon Island already carries, and it applies to the Cortez, Bridge Street, Longboat Pass and Coquina spots.'],
  'alert:mastrys-bait-and-tackle:01': ['skipped', null,
    'Shop data, handled by absence from the directory.'],
  'alert:bait-bucket-tierra-verde:01': ['skipped', null,
    'Unsourced and shop data. The closure needs a phone call, which is recorded in the research file.'],
};

/* ----------------------------------------------------------------- triage */

const decisions = [];
for (const i of ITEMS) {
  if (i.kind === 'alert') {
    const a = ALERTS[i.id];
    if (!a) { decisions.push({ id: i.id, status: 'pending', why: 'No explicit decision recorded — review by hand.', field: null }); continue; }
    decisions.push({ id: i.id, status: a[0], field: a[1], why: a[2] });
    continue;
  }
  const rule = RULES.find((r) => r.when(i));
  decisions.push({ id: i.id, status: rule.status, field: null, why: rule.why });
}

const byStatus = {};
for (const d of decisions) byStatus[d.status] = (byStatus[d.status] ?? 0) + 1;

writeFileSync(
  new URL('../src/admin/data/review-seed.json', import.meta.url),
  JSON.stringify(decisions, null, 2) + '\n',
);

/* --------------------------------------------------------------- write-up */

const item = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const group = (status) => decisions.filter((d) => d.status === status);

let md = `# Review decisions — first pass

Made by Claude on 2026-08-22, on the owner's instruction to take a first cut
rather than hand him 249 items. **Every one of these is a default, not a
verdict** — overturn anything in the owner console and it sticks.

| Outcome | Count |
|---|---|
| Accepted | ${byStatus.accepted ?? 0} |
| Needs info | ${byStatus.needs_info ?? 0} |
| Skipped | ${byStatus.skipped ?? 0} |
| Left pending | ${byStatus.pending ?? 0} |
| **Total** | **${decisions.length}** |

## The rules used on the bulk

${RULES.map((r, n) => `${n + 1}. **${r.status}** — ${r.why}`).join('\n')}

## The twenty corrections, decided one at a time

These say the guide is currently wrong about a real place, so a rule is the
wrong instrument. Each was read and decided individually.

${decisions.filter((d) => d.id.startsWith('alert:')).map((d) => {
  const i = item[d.id];
  return `### ${d.status.toUpperCase()} · ${i.target_label}\n\n> ${i.proposed.slice(0, 260)}${i.proposed.length > 260 ? '…' : ''}\n\n**Why:** ${d.why}\n`;
}).join('\n')}

## What still needs you

${group('needs_info').map((d) => `- **${item[d.id].target_label}** — ${d.why}`).join('\n')}
`;

writeFileSync(new URL('../docs/REVIEW_DECISIONS.md', import.meta.url), md);

console.log('decisions:', JSON.stringify(byStatus));
console.log('needs_info:', group('needs_info').length);
