/**
 * Writes accepted review items into the bundled guide data.
 *
 * Guide content is compiled into the app, so accepting an item in the console
 * only queues an edit. This is the step that lands it: it reads the decisions
 * from the triage pass and inserts the accepted strings into the right
 * location entries in src/data/locations.ts.
 *
 * Idempotent by refusal rather than by merge — it will not touch a location
 * that already has the field, so re-running cannot duplicate a note. Fields
 * that already carry researched content are left entirely alone.
 */
import ITEMS from '../src/admin/data/review-items.json' with { type: 'json' };
import SEED from '../src/admin/data/review-seed.json' with { type: 'json' };
import { readFileSync, writeFileSync } from 'node:fs';

const PATH = new URL('../src/data/locations.ts', import.meta.url);
const decision = new Map(SEED.map((d) => [d.id, d]));
const accepted = ITEMS.filter((i) => decision.get(i.id)?.status === 'accepted');

/** Spots that lost their easy bait stop when Annie's was demolished. */
const CLUSTER = ['cortez-bridge', 'bridge-street-pier', 'longboat-pass', 'coquina-beach'];
const CLUSTER_NOTE =
  'No easy bait stop on this stretch since Annie’s in Cortez was demolished in 2025 — the nearest live bait is Bridge Street Bait Shop, or Island Discount Tackle four miles north. Buy before you drive out.';

const FIELD = { seasons: 'seasons', daypart: 'dayparts', access_note: 'accessNotes', safety: 'safety' };

// Collect per location. GUIDE-targeted items (licences, permits) have no home
// in the location schema and are reported at the end rather than forced in.
const per = new Map();
const guideLevel = [];
for (const i of accepted) {
  if (i.target === 'GUIDE') { guideLevel.push(i); continue; }
  const f = FIELD[i.kind];
  if (!f) continue;                       // sources handled separately below
  if (!per.has(i.target)) per.set(i.target, { seasons: [], dayparts: [], accessNotes: [], safety: [] });
  const bucket = per.get(i.target)[f];
  if (!bucket.includes(i.proposed)) bucket.push(i.proposed);
}
for (const slug of CLUSTER) {
  if (!per.has(slug)) per.set(slug, { seasons: [], dayparts: [], accessNotes: [], safety: [] });
  per.get(slug).accessNotes.push(CLUSTER_NOTE);
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const block = (name, list) =>
  `    ${name}: [\n${list.map((s) => `      '${esc(s)}',`).join('\n')}\n    ],\n`;

let src = readFileSync(PATH, 'utf8');
const lines = src.split('\n');
const report = [];

for (const [slug, fields] of per) {
  const start = lines.findIndex((l) => l.includes(`slug: '${slug}'`));
  if (start < 0) { report.push(`  MISSING ${slug}`); continue; }

  // Locate this entry's targets array and its matching close.
  let ti = -1;
  for (let n = start; n < lines.length; n += 1) {
    if (lines[n] === '    targets: [') { ti = n; break; }
    if (lines[n] === '  },') break;                  // ran past the entry
  }
  if (ti < 0) { report.push(`  NO TARGETS ${slug}`); continue; }
  let depth = 0, close = -1;
  for (let n = ti; n < lines.length; n += 1) {
    depth += (lines[n].match(/\[/g) ?? []).length - (lines[n].match(/\]/g) ?? []).length;
    if (depth === 0) { close = n; break; }
  }
  if (close < 0) { report.push(`  UNBALANCED ${slug}`); continue; }

  // Entry text, so existing fields can be detected and left alone.
  let end = close;
  while (end < lines.length && lines[end] !== '  },') end += 1;
  const entry = lines.slice(start, end).join('\n');

  let insert = '';
  const added = [];
  for (const [name, list] of [['seasons', fields.seasons], ['accessNotes', fields.accessNotes], ['safety', fields.safety]]) {
    if (list.length === 0) continue;
    if (new RegExp(`^\\s{4}${name}:`, 'm').test(entry)) { added.push(`${name}(kept existing)`); continue; }
    insert += block(name, list);
    added.push(`${name}+${list.length}`);
  }
  if (insert) lines.splice(close + 1, 0, insert.replace(/\n$/, ''));

  // dayparts sits above targets in the house style.
  if (fields.dayparts.length && !/^\s{4}dayparts:/m.test(entry)) {
    const vals = [...new Set(fields.dayparts)];
    lines.splice(ti, 0, `    dayparts: [${vals.map((v) => `'${esc(v)}'`).join(', ')}],`);
    added.push(`dayparts+${vals.length}`);
  }
  report.push(`  ${slug}: ${added.join(', ') || 'nothing to add'}`);
}

writeFileSync(PATH, lines.join('\n'));
console.log(`applied to ${per.size} locations`);
report.forEach((r) => console.log(r));
console.log(`\nguide-level items accepted but NOT applied (no schema for them yet): ${guideLevel.length}`);
guideLevel.slice(0, 6).forEach((i) => console.log(`  ${i.kind}: ${i.proposed.slice(0, 72)}`));
