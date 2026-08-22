/**
 * Attaches accepted `source` items to their locations.
 *
 * Split from apply-review.mjs because sources are a different shape — objects,
 * not strings — and because src/test/content.test.ts enforces the rule that
 * makes them mandatory: a spot that states researched detail must cite
 * something. That test caught the first pass shipping notes with no citations,
 * which is the whole reason it exists.
 */
import ITEMS from '../src/admin/data/review-items.json' with { type: 'json' };
import SEED from '../src/admin/data/review-seed.json' with { type: 'json' };
import { readFileSync, writeFileSync } from 'node:fs';

const PATH = new URL('../src/data/locations.ts', import.meta.url);
const status = new Map(SEED.map((d) => [d.id, d.status]));

const per = new Map();
for (const i of ITEMS) {
  if (i.kind !== 'source' || status.get(i.id) !== 'accepted' || i.target === 'GUIDE') continue;
  const s = i.sources?.[0];
  if (!s?.url) continue;
  if (!per.has(i.target)) per.set(i.target, []);
  const list = per.get(i.target);
  if (!list.some((x) => x.url === s.url)) {
    list.push({ label: i.proposed, url: s.url, publisher: s.publisher ?? null });
  }
}

const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const idFor = (url, n) => {
  const host = url.split('/')[2]?.replace(/^www\./, '').split('.')[0] ?? 'src';
  return `${host}-${n + 1}`;
};

let lines = readFileSync(PATH, 'utf8').split('\n');
const report = [];

for (const [slug, list] of per) {
  const start = lines.findIndex((l) => l.includes(`slug: '${slug}'`));
  if (start < 0) { report.push(`  MISSING ${slug}`); continue; }
  let end = start;
  while (end < lines.length && lines[end] !== '  },') end += 1;
  const entry = lines.slice(start, end).join('\n');
  if (/^\s{4}sources:/m.test(entry)) { report.push(`  ${slug}: kept existing sources`); continue; }

  const block =
    '    sources: [\n' +
    list.map((s, n) =>
      `      {\n` +
      `        id: '${esc(idFor(s.url, n))}',\n` +
      `        label: '${esc(s.label)}',\n` +
      `        url: '${esc(s.url)}',\n` +
      (s.publisher ? `        publisher: '${esc(s.publisher)}',\n` : '') +
      `      },`).join('\n') +
    '\n    ],';
  lines.splice(end, 0, block);
  report.push(`  ${slug}: sources+${list.length}`);
}

writeFileSync(PATH, lines.join('\n'));
console.log(`sources applied to ${per.size} locations`);
report.forEach((r) => console.log(r));
