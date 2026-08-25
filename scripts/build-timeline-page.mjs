#!/usr/bin/env node
/**
 * Renders docs/project-timeline.json into docs/project-timeline.html.
 *
 * The published Artifact is generated, never hand-edited. `project-manager`
 * updates the JSON from git and a fresh count of src/data/, runs this, and the
 * page is redeployed to the same URL — so the numbers on screen can only ever
 * be the numbers in the data, and a stale figure has nowhere to hide.
 *
 *   node scripts/build-timeline-page.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(ROOT, 'docs/project-timeline.json'), 'utf8'));

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** CRITICAL of any flavour is critical; everything else falls back to its own word. */
const sevClass = (s) => {
  const t = String(s).toUpperCase();
  if (t.startsWith('CRITICAL')) return 'crit';
  if (t.startsWith('IMPORTANT')) return 'warn';
  return 'struct';
};

/**
 * Long prose as readable paragraphs, not one slab. Sentences are grouped in
 * threes, and `backticked` spans become code — the verdict field leans on both.
 */
const prose = (text, per = 3) => {
  const sentences = String(text ?? '')
    .split(/(?<=[.?!])\s+(?=[A-Z(`])/)
    .filter(Boolean);
  const out = [];
  for (let i = 0; i < sentences.length; i += per) out.push(sentences.slice(i, i + per).join(' '));
  return out
    .map((p) => `<p>${esc(p).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`)
    .join('\n    ');
};

/** A filesystem path is not a useful provenance line on a published page. */
const repoLabel = (r) => {
  const s = String(r ?? '');
  if (/^https?:\/\//.test(s)) return s.replace(/^https?:\/\//, '');
  return 'github.com/gitjdevenyns/shorebound';
};

const statusLabel = (s) => String(s).replace(/_/g, ' ');
const statusClass = (s) =>
  s === 'not_started' ? 'st-none' : s === 'partial' ? 'st-part' : s === 'done_with_defects' ? 'st-def' : 'st-broke';

/** A phase still running has no end date; say so rather than "Invalid Date". */
const fmtDate = (d) => {
  if (!d) return 'ongoing';
  const t = new Date(`${d}T00:00:00Z`);
  if (Number.isNaN(t.getTime())) return 'ongoing';
  return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

const M = data.metrics ?? {};
const m = (k) => M[k] ?? {};

// --- summary numbers -------------------------------------------------------
const blockers = data.blockers ?? [];
const critical = blockers.filter((b) => sevClass(b.severity) === 'crit');
const v1 = data.v1_items ?? [];
const v1Done = v1.filter((i) => i.status === 'done' || i.status === 'done_with_defects').length;
const maxCommits = Math.max(...(data.phases ?? []).map((p) => p.commit_count || 0), 1);

// The two facts that decide whether "fixed" means anything.
const pushed = m('security_fix_migrations_pushed_to_prod');
const committed = m('phase6_changes_committed');

const metricTile = (key, label) => {
  const t = M[key];
  if (!t) return '';
  const v = typeof t.value === 'boolean' ? (t.value ? 'yes' : 'no') : t.value;
  const bad = t.value === false;
  return `<div class="tile${bad ? ' tile-bad' : ''}">
      <div class="tile-v">${esc(v)}</div>
      <div class="tile-l">${esc(label)}</div>
      ${t.verified === false ? '<span class="chip chip-unv">unverified</span>' : ''}
      ${t.note ? `<p class="tile-n">${esc(t.note)}</p>` : ''}
    </div>`;
};

const html = `<title>Shorebound Launch Tracker</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Instrument+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --navy:#031530; --lime:#8dff00;
  --ground:#eef1f4; --surface:#ffffff; --raised:#f7f9fa;
  --text:#0a1c33; --muted:#5d6b7c; --line:#d6dde4;
  --crit:#c8392e; --warn:#b3711a; --good:#1c7d52; --struct:#4a6076;
  --crit-bg:#fbeceb; --warn-bg:#fbf3e6; --good-bg:#e9f5ef; --hdr:#031530;
  --display:"Bricolage Grotesque",ui-sans-serif,system-ui,sans-serif;
  --body:"Instrument Sans",ui-sans-serif,system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --ground:#050d1a; --surface:#0b1728; --raised:#111f33;
  --text:#e3eaf2; --muted:#93a3b5; --line:#1e2e45;
  --crit:#ff7b6b; --warn:#e5a854; --good:#4fc48d; --struct:#8aa2ba;
  --crit-bg:#2a1512; --warn-bg:#261c0c; --good-bg:#0d2419; --hdr:#8dff00;
}}
:root[data-theme="dark"]{
  --ground:#050d1a; --surface:#0b1728; --raised:#111f33;
  --text:#e3eaf2; --muted:#93a3b5; --line:#1e2e45;
  --crit:#ff7b6b; --warn:#e5a854; --good:#4fc48d; --struct:#8aa2ba;
  --crit-bg:#2a1512; --warn-bg:#261c0c; --good-bg:#0d2419; --hdr:#8dff00;
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--text);font-family:var(--body);
  font-size:16px;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:clamp(28px,5vw,64px) clamp(18px,4vw,40px) 96px}
h1,h2,h3{font-family:var(--display);text-wrap:balance;margin:0}
a{color:inherit}
.eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}

/* header */
header{border-bottom:2px solid var(--hdr);padding-bottom:22px;margin-bottom:34px}
h1{font-size:clamp(34px,6vw,58px);font-weight:800;letter-spacing:-.02em;line-height:1.02;margin:10px 0 6px}
.sub{color:var(--muted);max-width:62ch}
.stamp{font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:14px}

/* verdict */
.verdict{background:var(--surface);border:1px solid var(--line);border-left:5px solid var(--lime);
  border-radius:3px;padding:22px 24px;margin-bottom:30px}
.verdict h2{font-size:19px;font-weight:600;margin-bottom:8px}
.verdict p{margin:0 0 12px;color:var(--muted);max-width:70ch}
.verdict p:last-child{margin-bottom:0}
code{font-family:var(--mono);font-size:.88em;background:var(--raised);
  border:1px solid var(--line);border-radius:2px;padding:1px 5px}

/* alarm */
.alarm{background:var(--crit-bg);border:1px solid var(--crit);border-radius:3px;padding:20px 24px;margin-bottom:34px}
.alarm h2{font-size:17px;font-weight:600;color:var(--crit);margin-bottom:6px}
.alarm p{margin:0;max-width:74ch}

section{margin-top:46px}
section>h2{font-size:13px;font-family:var(--mono);letter-spacing:.14em;text-transform:uppercase;
  color:var(--muted);padding-bottom:9px;border-bottom:1px solid var(--line);margin-bottom:20px;font-weight:500}

/* metric tiles */
.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:12px}
.tile{background:var(--surface);border:1px solid var(--line);border-radius:3px;padding:14px 15px}
.tile-bad{border-color:var(--crit)}
.tile-v{font-family:var(--display);font-size:29px;font-weight:800;line-height:1;letter-spacing:-.02em;
  font-variant-numeric:tabular-nums}
.tile-bad .tile-v{color:var(--crit)}
.tile-l{font-size:12.5px;color:var(--muted);margin-top:5px}
.tile-n{font-size:11.5px;color:var(--muted);margin:7px 0 0;line-height:1.45}
.chip{display:inline-block;font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;
  text-transform:uppercase;padding:2px 6px;border-radius:2px;margin-top:7px}
.chip-unv{background:var(--warn-bg);color:var(--warn);border:1px solid var(--warn)}

/* blockers */
.blk{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--struct);
  border-radius:3px;padding:15px 18px;margin-bottom:10px}
.blk.crit{border-left-color:var(--crit)}
.blk.warn{border-left-color:var(--warn)}
.blk-h{display:flex;gap:12px;align-items:baseline;flex-wrap:wrap;margin-bottom:5px}
.sev{font-family:var(--mono);font-size:10px;letter-spacing:.09em;text-transform:uppercase;
  padding:2px 7px;border-radius:2px;white-space:nowrap}
.crit .sev{background:var(--crit-bg);color:var(--crit)}
.warn .sev{background:var(--warn-bg);color:var(--warn)}
.struct .sev{background:var(--raised);color:var(--struct)}
.blk-t{font-family:var(--display);font-size:16.5px;font-weight:600;flex:1;min-width:min(100%,320px)}
.blk p{margin:0;font-size:14.5px;color:var(--muted);max-width:82ch}
.src{font-family:var(--mono);font-size:11px;color:var(--muted);margin-top:8px;display:block;opacity:.85}

/* v1 */
.v1{display:grid;gap:10px}
.v1row{display:grid;grid-template-columns:auto 1fr;gap:14px;background:var(--surface);
  border:1px solid var(--line);border-radius:3px;padding:15px 18px}
.v1n{font-family:var(--mono);font-size:12px;color:var(--muted);padding-top:3px}
.v1t{font-family:var(--display);font-size:16.5px;font-weight:600;margin-bottom:5px}
.pill{display:inline-block;font-family:var(--mono);font-size:10px;letter-spacing:.07em;
  text-transform:uppercase;padding:2px 8px;border-radius:2px;margin-left:9px;vertical-align:2px}
.st-none{background:var(--crit-bg);color:var(--crit)}
.st-part{background:var(--warn-bg);color:var(--warn)}
.st-def{background:var(--good-bg);color:var(--good)}
.st-broke{background:var(--crit-bg);color:var(--crit)}
.v1row p{margin:0;font-size:14px;color:var(--muted);max-width:82ch}

/* timeline — a sounding line down the left, depth marks per phase */
.ph{display:grid;grid-template-columns:78px 1fr;gap:20px;position:relative;padding-bottom:26px}
.ph::before{content:"";position:absolute;left:77px;top:6px;bottom:0;width:1px;background:var(--line)}
.ph:last-child::before{display:none}
.ph-when{text-align:right;font-family:var(--mono);font-size:11.5px;color:var(--muted);line-height:1.5;padding-top:2px}
.ph-body{position:relative;padding-left:18px}
.ph-body::before{content:"";position:absolute;left:-4px;top:7px;width:9px;height:9px;border-radius:50%;
  background:var(--surface);border:2px solid var(--struct)}
.ph:last-child .ph-body::before{background:var(--lime);border-color:var(--lime)}
.ph-t{font-family:var(--display);font-size:18px;font-weight:600;margin-bottom:4px}
.ph p{margin:0;font-size:14.5px;color:var(--muted);max-width:80ch}
.bar{height:4px;background:var(--struct);border-radius:2px;margin-top:9px;opacity:.4}
.ph:last-child .bar{background:var(--lime);opacity:1}
.cc{font-family:var(--mono);font-size:11px;color:var(--muted);margin-left:8px}

/* lists */
.rows{display:grid;gap:9px}
.row{background:var(--surface);border:1px solid var(--line);border-radius:3px;padding:13px 17px}
.row b{font-family:var(--display);font-size:15.5px;font-weight:600;display:block;margin-bottom:3px}
.row p{margin:0;font-size:14px;color:var(--muted);max-width:82ch}
.notes li{font-size:14.5px;color:var(--muted);margin-bottom:9px;max-width:84ch}
footer{margin-top:60px;padding-top:20px;border-top:1px solid var(--line);
  font-family:var(--mono);font-size:11.5px;color:var(--muted);line-height:1.7}
@media (max-width:600px){
  .ph{grid-template-columns:1fr;gap:4px}
  .ph::before{display:none}
  .ph-when{text-align:left}
  .v1row{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>

<div class="wrap">
<header>
  <div class="eyebrow">Shorebound &middot; St. Petersburg to Boca Grande Pass</div>
  <h1>Launch Tracker</h1>
  <p class="sub">Where this project came from, what is actually true today, and what stands between here and a listing. Every number is measured from the repository, not carried forward from a previous note.</p>
  <div class="stamp">Generated ${esc(data.generated_at)} &nbsp;&middot;&nbsp; ${esc(repoLabel(data.source_repo))}</div>
</header>

<div class="verdict">
  <h2>Is it on track?</h2>
  ${prose(data.on_track)}
</div>

${
  pushed.value === false || committed.value === false
    ? `<div class="alarm">
  <h2>Fixed is not the same as shipped</h2>
  <p>${
    pushed.value === false
      ? 'The two security migrations exist as files but <strong>have not been applied to the production database</strong> &mdash; <code>supabase migration list</code> reports no remote timestamp for either. Until <code>supabase db push</code> runs, both vulnerabilities are live. '
      : ''
  }${
        committed.value === false
          ? 'Remediation work is also not yet merged to <code>main</code>, which is what Cloudflare deploys from.'
          : ''
      }</p>
</div>`
    : ''
}

<section>
  <h2>Verified state</h2>
  <div class="tiles">
    ${metricTile('spots', 'researched spots')}
    ${metricTile('documented_species', 'species pages')}
    ${metricTile('species_per_spot_recipes', 'spot recipes')}
    ${metricTile('shops_total', 'shops listed')}
    ${metricTile('shops_verified', 'shops verified')}
    ${metricTile('cited_sources', 'cited sources')}
    ${metricTile('tests_passing', 'tests passing')}
    ${metricTile('total_commits', 'commits')}
  </div>
</section>

<section>
  <h2>Launch blockers &mdash; ${critical.length} critical of ${blockers.length}</h2>
  ${blockers
    .map(
      (b) => `<div class="blk ${sevClass(b.severity)}">
    <div class="blk-h"><span class="sev">${esc(b.severity)}</span><span class="blk-t">${esc(b.title)}</span></div>
    <p>${esc(b.summary)}</p>
    <span class="src">${esc(b.source)}</span>
  </div>`,
    )
    .join('\n  ')}
</section>

<section>
  <h2>v1 scorecard &mdash; ${v1Done} of ${v1.length} landed, none clean</h2>
  <div class="v1">
  ${v1
    .map(
      (i, n) => `<div class="v1row">
    <div class="v1n">${String(n + 1).padStart(2, '0')}</div>
    <div>
      <div class="v1t">${esc(i.title)}<span class="pill ${statusClass(i.status)}">${esc(statusLabel(i.status))}</span></div>
      <p>${esc(i.evidence)}</p>
    </div>
  </div>`,
    )
    .join('\n  ')}
  </div>
</section>

<section>
  <h2>How it got here</h2>
  ${(data.phases ?? [])
    .map(
      (p) => `<div class="ph">
    <div class="ph-when">${esc(fmtDate(p.start))}<br>${esc(fmtDate(p.end))}</div>
    <div class="ph-body">
      <div class="ph-t">${esc(p.name)}${p.commit_count ? `<span class="cc">${esc(p.commit_count)} commits</span>` : ''}</div>
      <p>${esc(p.summary)}</p>
      ${p.commit_count ? `<div class="bar" style="width:${Math.round((p.commit_count / maxCommits) * 100)}%"></div>` : ''}
    </div>
  </div>`,
    )
    .join('\n  ')}
</section>

<section>
  <h2>Waiting on the owner</h2>
  <div class="rows">
  ${(data.owner_blocked ?? [])
    .map((o) => `<div class="row"><b>${esc(o.title)}</b><p>${esc(o.summary)}</p></div>`)
    .join('\n  ')}
  </div>
</section>

<section>
  <h2>Found, not scheduled</h2>
  <ul class="notes">
  ${(data.found_not_scheduled ?? []).map((f) => `<li>${esc(f)}</li>`).join('\n  ')}
  </ul>
</section>

<footer>
  Generated from <code>docs/project-timeline.json</code> by <code>scripts/build-timeline-page.mjs</code>.<br>
  Do not hand-edit this page &mdash; update the data and regenerate, so a stale number has nowhere to hide.${
    data.artifact_url ? `<br>Republished in place at <code>${esc(data.artifact_url)}</code>.` : ''
  }
</footer>
</div>
`;

writeFileSync(join(ROOT, 'docs/project-timeline.html'), html);
console.log(
  `built docs/project-timeline.html — ${(data.phases ?? []).length} phases, ${blockers.length} blockers (${critical.length} critical), ${v1.length} v1 items`,
);
