import type { ComponentType } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getLocation, getTideGuide } from '../lib/api';
import { getVideos } from '../lib/api';
import { rigById } from '../data';
import type { Location, TideStage } from '../data';
import { useConditions } from '../lib/useConditions';
import { timeAgo } from '../lib/conditions';
import LazyMap from '../components/LazyMap';
import TideTimeline from '../components/TideTimeline';
import TargetRecipe from '../components/TargetRecipe';
import StructureMap from '../components/location/StructureMap';
import Cautions from '../components/location/Cautions';
import { zonesFor, zoneForTarget } from '../components/location/zones';
import type { Zone } from '../components/location/zones';
import {
  Callout,
  ErrorState,
  FreshnessNote,
  SectionTitle,
  Skeleton,
} from '../components/ui';
import { IconClarity, IconMoon, IconTemp, IconWind } from '../components/ui/icons';
import BaitNearby from '../components/location/BaitNearby';
import NotFound from './NotFound';

/**
 * The flagship screen (design board 02): what you are looking at, when to fish
 * it, what to tie on, where to cast, how to put the fish back.
 *
 * One template renders all 25 locations from the migrated data. Where the
 * data is genuinely empty — seasons, access notes, per-location safety and
 * sources are empty for every spot today — the page says so plainly instead of
 * filling the slot with something plausible. See CLAUDE.md: a local tactic must
 * never be dressed up as a regulation, and nothing here may be invented.
 */

const STAGE_LABEL: Record<TideStage, string> = {
  low: 'Low',
  incoming: 'Incoming',
  high: 'High',
  outgoing: 'Outgoing',
};

const ACCESS_LABEL: Record<string, string> = {
  shore: 'walk-in shore',
  kayak: 'kayak',
  boat: 'boat',
  pier: 'pier',
  wade: 'wading',
  bridge: 'bridge',
};

/** Station-local clock from an offset-qualified ISO string (see conditions.ts). */
function stationClock(iso: string): string | null {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return null;
  const h = Number(m[1]);
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${suffix}`;
}

const fmtCoord = (n: number) => n.toFixed(4).replace('-', '−');

/** The general water principles the guide already documents, by title. */
const MODIFIER_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Wind: IconWind,
  'Water clarity': IconClarity,
  Temperature: IconTemp,
  'Moon / tide range': IconMoon,
};

function NowCard({ loc, zones }: { loc: Location; zones: Zone[] }) {
  const { status, data, freshness, error, refetch } = useConditions(loc.slug);
  const phase = data?.phase ?? null;
  const stage = phase?.stage ?? null;
  const focus = stage ? zones.filter((z) => z.stages.includes(stage)) : [];
  const isPrime = stage ? loc.tide_playbook.prime_stages.includes(stage) : false;

  return (
    <div className="rec">
      <div className="rec-top">
        {status === 'ready' && stage ? (
          <>
            <p className="lab lab-lime">
              Right now · tide is {stage}
              {isPrime ? ' · prime window here' : ''}
            </p>
            <h2>{loc.tide_playbook[stage]}</h2>
          </>
        ) : status === 'loading' ? (
          <div aria-busy="true">
            <p className="lab lab-lime">Reading the tide…</p>
            <Skeleton />
          </div>
        ) : (
          <>
            <p className="lab lab-lime">Plan it on the tide</p>
            <h2>{loc.tide_playbook.best_window}</h2>
          </>
        )}
      </div>

      <div className="rec-why">
        <div className="bar" />
        <div className="mut" style={{ color: 'var(--t)' }}>
          {status === 'error' ? (
            <ErrorState onRetry={refetch}>
              <span>
                Live tide data did not load{error ? `: ${error}` : ''}. The tide plan below
                does not need it.
              </span>
            </ErrorState>
          ) : (
            <>
              {status === 'ready' && phase?.next ? (
                <>
                  Next {phase.next.type === 'H' ? 'high' : 'low'} at{' '}
                  <b>{stationClock(phase.next.time) ?? 'an unknown time'}</b> station time
                  {phase.height_ft !== null ? `, about ${phase.height_ft.toFixed(1)} ft now` : ''}
                  .{' '}
                </>
              ) : null}
              {focus.length > 0 ? (
                <>
                  Start on{' '}
                  {focus.map((z, i) => (
                    <span key={z.n}>
                      {i === 0 ? '' : i === focus.length - 1 ? ' and ' : ', '}
                      <span className="zonepin">{z.n}</span> {z.title.toLowerCase()}
                    </span>
                  ))}
                  .
                </>
              ) : (
                <>
                  This spot reads best on <b>{loc.tide_playbook.best_window.toLowerCase()}</b>.
                  The four stages below say what changes as the water moves.
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="pad" style={{ paddingBottom: 'var(--s4)', display: 'flex', gap: 'var(--s2)' }}>
        <a
          className="btn btn-lime grow"
          href={`https://maps.apple.com/?ll=${loc.lat},${loc.lng}&q=${encodeURIComponent(loc.name)}`}
          target="_blank"
          rel="noreferrer"
        >
          Open in Maps
        </a>
        <a
          className="btn btn-ghost grow"
          href={data?.station_url ?? loc.tide_station.url}
          target="_blank"
          rel="noreferrer"
        >
          Tide chart
        </a>
      </div>

      {(status === 'ready' || (status === 'error' && data)) && (
        <div className="pad" style={{ paddingBottom: 'var(--s3)' }}>
          <FreshnessNote state={freshness}>
            {data?.station_name ?? loc.tide_station.name} · updated{' '}
            {timeAgo(data?.refreshed_at)}
          </FreshnessNote>
        </div>
      )}
    </div>
  );
}

export default function LocationDetail() {
  const { slug } = useParams();
  const loc = slug ? getLocation(slug) : undefined;
  if (!loc) return <NotFound />;

  const zones = zonesFor(loc);
  const principles = getTideGuide().principles.filter((p) => p.title in MODIFIER_ICONS);
  const rigs = [
    ...new Map(
      loc.targets
        .map((t) => (t.rig_id ? rigById(t.rig_id) : undefined))
        .filter((r): r is NonNullable<typeof r> => Boolean(r))
        .map((r) => [r.id, r]),
    ).values(),
  ];
  const knots = getVideos().filter((v) => /knot/i.test(v.title));
  const primeChip =
    loc.tide_playbook.prime_stages.length > 0
      ? `Prime: ${loc.tide_playbook.prime_stages.map((s) => STAGE_LABEL[s].toLowerCase()).join(' + ')}`
      : `Best: ${loc.tide_playbook.best_window}`;

  return (
    <>
      <p className="pad" style={{ paddingTop: 'var(--s3)' }}>
        <Link className="backlink" to="/locations">
          ‹ All spots
        </Link>
      </p>

      {/* The hero band is a photo slot with no photo: there is no licensed
          picture of any of these spots, and the band used to announce
          that in a caption, which reads as a broken image. A still satellite
          view of the spot's own coordinates is real imagery of the real place,
          so the band now carries one behind the existing scrim. It is
          deliberately non-interactive — the map you can actually drive is in
          the access panel below — and the Esri credit the tile layer needs is
          the caption chip, since the scrim covers Leaflet's own control. */}
      <div className="lochero">
        <LazyMap
          className="lochero-map"
          // Backdrop: if the chunk never arrives the band keeps its gradient
          // rather than explaining itself over the title.
          quiet
          // No pin: the band is this one place, its coordinates are printed on
          // it, and a centred marker would land on top of the chips. The map
          // you can read pins off is the one in the access panel.
          locations={[]}
          center={[loc.lat, loc.lng]}
          // Tighter than this and several spots — a pass, a channel — fill the
          // band with featureless green water. 15 keeps a shoreline in shot at
          // every one of the locations while the structure is still readable.
          zoom={15}
          mini
          satellite
          interactive={false}
          label={`Satellite view of ${loc.name}`}
        />
        <span className="cap">esri world imagery · satellite</span>
        <div className="inner">
          <div className="row g2 wrap" style={{ marginBottom: 8 }}>
            <span className="chip chip-lime">{primeChip}</span>
            <span
              className="chip"
              style={{
                background: 'rgba(255,255,255,.12)',
                borderColor: 'rgba(255,255,255,.28)',
                color: '#e8f1fe',
              }}
            >
              {loc.access.map((a) => ACCESS_LABEL[a] ?? a).join(' · ')}
            </span>
          </div>
          <h1 className="d2">{loc.name}</h1>
          <p className="mono" style={{ color: '#c5dcff', marginTop: 6 }}>
            {loc.region} · {fmtCoord(loc.lat)}, {fmtCoord(loc.lng)} ·{' '}
            {loc.structures.join(' · ')}
          </p>
        </div>
      </div>

      <section className="sect" aria-labelledby="now">
        <SectionTitle id="now">What to do here</SectionTitle>
        <NowCard loc={loc} zones={zones} />
      </section>

      <div className="sect">
        <div className="cols-2">
          <section aria-labelledby="access">
            <SectionTitle id="access">Access</SectionTitle>
            <div className="card card-pad">
              <p className="kvrow">
                <span className="k">Access</span>
                <span className="v">
                  {loc.access.map((a) => ACCESS_LABEL[a] ?? a).join(' · ')}
                </span>
              </p>
              <p className="kvrow">
                <span className="k">Area</span>
                <span className="v">{loc.region}</span>
              </p>
              <p className="kvrow">
                <span className="k">Coordinates</span>
                <span className="v mono">
                  {fmtCoord(loc.lat)}, {fmtCoord(loc.lng)}
                </span>
              </p>
              <p className="kvrow">
                <span className="k">Tide station</span>
                <span className="v">
                  <a href={loc.tide_station.url} target="_blank" rel="noreferrer">
                    {loc.tide_station.name} ↗
                  </a>
                  <br />
                  <span className="mut xs">
                    Nearest station on the same water — not necessarily the closest one.
                  </span>
                </span>
              </p>
              <p className="kvrow">
                <span className="k">Navigate</span>
                <span className="v">
                  <a
                    href={`https://maps.apple.com/?ll=${loc.lat},${loc.lng}&q=${encodeURIComponent(loc.name)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Apple Maps ↗
                  </a>
                  {' · '}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Maps ↗
                  </a>
                </span>
              </p>
            </div>

            {loc.access_notes.length > 0 ? (
              <ul className="bullets" style={{ marginTop: 'var(--s3)' }}>
                {loc.access_notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : (
              <p className="mut xs" style={{ marginTop: 'var(--s3)' }}>
                Parking, gate hours, launch and walk-in details for this spot have not been
                checked yet, so the guide does not state any. Confirm access and any closures
                before you drive out.
              </p>
            )}

            <div style={{ marginTop: 'var(--s3)' }}>
              <LazyMap
                locations={[loc]}
                center={[loc.lat, loc.lng]}
                zoom={15}
                mini
                satellite
                label={`Satellite map of ${loc.name}`}
              />
              <p className="mut xs" style={{ marginTop: 6 }}>
                Esri World Imagery. Switch to the street layer with the control in the corner.
              </p>
            </div>
          </section>

          <section aria-labelledby="when">
            <SectionTitle id="when">When to fish it</SectionTitle>
            <div className="card card-pad">
              <p className="kvrow">
                <span className="k">Tide</span>
                <span className="v">{loc.tide_playbook.best_window}</span>
              </p>
              <p className="kvrow">
                <span className="k">Light</span>
                <span className="v">
                  {loc.dayparts.length > 0 ? (
                    loc.dayparts.join(' · ')
                  ) : (
                    <span className="mut">Not documented for this spot yet</span>
                  )}
                </span>
              </p>
              <p className="kvrow">
                <span className="k">Season</span>
                <span className="v">
                  {loc.seasons.length > 0 ? (
                    loc.seasons.join(', ')
                  ) : (
                    <span className="mut">Not documented for this spot yet</span>
                  )}
                </span>
              </p>
              <p className="kvrow">
                <span className="k">Structure</span>
                <span className="v">{loc.structures.join(' · ')}</span>
              </p>
            </div>

            <p className="lab" style={{ margin: 'var(--s4) 0 var(--s2)' }}>
              General water principles
            </p>
            <div className="mods">
              {principles.map((p) => {
                const Icon = MODIFIER_ICONS[p.title];
                return (
                  <div className="mod" key={p.title}>
                    <span className="ic2">
                      <Icon />
                    </span>
                    <div>
                      <b>{p.title}</b>
                      <span className="t">{p.body}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <Callout tone="info" title="These are local heuristics" className="mt3">
              Tactics and starting points, not regulation. Bag limits, closed seasons, gear
              rules and licence requirements live with the FWC — see the sources at the bottom
              of this page, and check them before you keep anything.
            </Callout>
          </section>
        </div>
      </div>

      <div className="sect">
        <div className="cols-2">
          <section aria-labelledby="structure">
            <SectionTitle id="structure">Read the structure</SectionTitle>
            <p className="mut" style={{ marginBottom: 'var(--s3)' }}>
              Everything productive here is an <b>edge</b>: where grass stops, where shell
              starts, where moving water meets still water. The numbers below are used again in
              the tide stages and on every species card.
            </p>
            {zones.length > 0 ? (
              <>
                <StructureMap loc={loc} zones={zones} />
                <p className="mut xs" style={{ marginTop: 'var(--s2)' }}>
                  Schematic: it shows which features this spot has, not where they sit. Use the
                  satellite map above for the real layout.
                </p>
                <ul className="zonelist">
                  {zones.map((z) => (
                    <li key={z.n}>
                      <span className="pin">{z.n}</span>
                      <span>
                        <b>{z.title}.</b> {z.look}{' '}
                        {z.habitatId && (
                          <Link to="/water">How to read this water →</Link>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mut">
                No structure is recorded for this spot yet, so there is nothing honest to draw.
              </p>
            )}
          </section>

          <section aria-labelledby="stages">
            <SectionTitle id="stages">The four stages here</SectionTitle>
            <TideTimeline playbook={loc.tide_playbook} zones={zones} />
            <p className="mut xs" style={{ marginTop: 'var(--s2)' }}>
              Highlighted stages are the prime windows for this kind of structure. General
              principles: <Link to="/tides">Tides + Water →</Link>
            </p>
          </section>
        </div>
      </div>

      <section className="sect" aria-labelledby="playbook">
        <SectionTitle id="playbook">Species playbook</SectionTitle>
        <p className="mut" style={{ marginTop: 0 }}>
          The species most worth fishing for here, in the order most anglers work them — not a list
          of everything that swims past. Expect company you did not plan on.
        </p>
        {loc.targets.length > 0 ? (
          <div className="stack g4">
            {loc.targets.map((t) => (
              <TargetRecipe
                key={`${t.species_label}-${t.priority}`}
                target={t}
                zone={zoneForTarget(zones, t)}
              />
            ))}
          </div>
        ) : (
          <p className="mut">No species research is recorded for this spot yet.</p>
        )}
        <p className="mut xs" style={{ marginTop: 'var(--s3)' }}>
          Tackle sizes are starting points, not rules — structure and current can call for
          heavier gear.
        </p>
      </section>

      <section className="sect" aria-labelledby="rigs">
        <SectionTitle id="rigs" to="/rigs" linkLabel="All rigs">
          Knots &amp; rigs for this page
        </SectionTitle>
        <div className="card">
          {rigs.map((r) => (
            <Link className="linkrow" to="/rigs" key={r.id}>
              <span className="row g3">
                <span className="pl" aria-hidden="true">
                  ▤
                </span>
                <span>
                  <b>{r.name}</b>
                  <span className="mut xs" style={{ display: 'block' }}>
                    {r.schematic}
                  </span>
                </span>
              </span>
              <span className="mut" aria-hidden="true">
                ›
              </span>
            </Link>
          ))}
          {knots.map((v) => (
            <a
              className="linkrow"
              key={v.url}
              href={v.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="row g3">
                <span className="pl" aria-hidden="true">
                  ▶
                </span>
                <span>
                  <b>{v.title}</b>
                  <span className="mut xs" style={{ display: 'block' }}>
                    Video · opens on YouTube
                  </span>
                </span>
              </span>
              <span className="mut" aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="sect" aria-labelledby="before">
        <SectionTitle id="before">Before you go</SectionTitle>
        <Cautions loc={loc} zones={zones} />
      </section>

      <section className="sect" aria-labelledby="sources" style={{ paddingBottom: 'var(--s7)' }}>
        <SectionTitle id="sources">Sources</SectionTitle>
        {loc.sources.length > 0 ? (
          <ul className="bullets">
            {loc.sources.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label} ↗
                </a>
                {s.publisher ? ` — ${s.publisher}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="srcs">
            No source has been attached to this spot's tactics yet — treat them as a starting
            point rather than a citation. What this page does rest on: regulations, seasons and
            fish handling,{' '}
            <a href="https://myfwc.com/fishing/saltwater/" target="_blank" rel="noreferrer">
              FWC saltwater fishing
            </a>
            . Tide predictions,{' '}
            <a href={loc.tide_station.url} target="_blank" rel="noreferrer">
              {loc.tide_station.name}
            </a>
            . Species profiles,{' '}
            <a
              href="https://www.floridamuseum.ufl.edu/discover-fish/"
              target="_blank"
              rel="noreferrer"
            >
              Florida Museum
            </a>
            .
          </p>
        )}
      </section>
      <BaitNearby location={loc} />
    </>
  );
}
