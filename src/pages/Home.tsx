import { Link } from 'react-router-dom';
import { getFishList, getHabitats, getHazards, getLocations } from '../lib/api';
import { REGIONS } from '../data';
import type { Location, TideStage } from '../data';
import { useConditions } from '../lib/useConditions';
import {
  compactSky,
  countdown,
  describeTidePosition,
  stationClock,
  timeAgo,
} from '../lib/conditions';
import type { ConditionsResult } from '../lib/conditions';
import { Callout, ErrorState, FreshnessNote, Plate, SectionTitle, Skeleton } from '../components/ui';
import LazyMap from '../components/LazyMap';
import NearYou from '../components/NearYou';
import { useGeolocation } from '../lib/geo';
import { rankNearby } from '../lib/nearby';
import {
  Chevron,
  HabitatGlyph,
  HeroChart,
  HeroWave,
  TideCurve,
  tideLevel,
} from '../components/location/art';
import { zonesFor } from '../components/location/zones';
import { IconCameraFish } from '../components/ui/icons';

/**
 * Home (design board 01). The first fold answers one question — go where, on
 * what tide, and why — and everything below it is browsing.
 *
 * Live conditions are strictly additive (see lib/conditions.ts): the page is
 * complete and useful with zero network, so every live slot either shows real
 * data, a skeleton, an inline retry, or nothing at all. It never shows a
 * plausible-looking placeholder.
 */

/** The reference station for the home card. Stated on the card, not implied. */
const REFERENCE_SLUG = 'emerson-point';

const STAGE_CHIP: Record<TideStage, string> = {
  low: 'Low water',
  incoming: 'Tide is filling',
  high: 'High water',
  outgoing: 'Tide is falling',
};

/**
 * The spot to send someone to right now.
 *
 * With a live tide stage we can say something defensible: this location's
 * playbook lists that stage as one of its prime windows. Without one we fall
 * back to a stable starting point and say so — no "best on this tide" claim
 * that nothing backs up.
 */
function pickRecommendation(stage: TideStage | null, locations: Location[]): Location {
  const fallback = locations[0];
  if (!stage) return fallback;
  const prime = locations.filter((l) => l.tide_playbook.prime_stages.includes(stage));
  if (prime.length === 0) return fallback;
  const walkable = prime.find((l) => l.access.includes('shore') || l.access.includes('wade'));
  return walkable ?? prime[0];
}

/* ------------------------------------------------------------ conditions */

function ConditionsCard({
  spot,
  conditions,
}: {
  /** The spot whose own station this card reports. Not a fixed reference. */
  spot: Location;
  conditions: ConditionsResult;
}) {
  const { status, data, freshness, error, refetch } = conditions;
  const phase = data?.phase ?? null;
  const weather = data?.weather ?? null;
  // Where the water sits between the turns either side of it, and how long
  // until the next one. Both are what make the curve below a reading rather
  // than a decorative wave.
  const position = data ? describeTidePosition(data.tides, phase) : null;
  const nextIn = phase?.next ? countdown(phase.next.time) : null;

  const cells: Array<[string, string, string?]> = [];
  if (weather?.air_temp_f !== null && weather?.air_temp_f !== undefined)
    cells.push(['Air', `${Math.round(weather.air_temp_f)}°`]);
  if (weather?.wind_mph !== null && weather?.wind_mph !== undefined)
    cells.push(['Wind', `${weather.wind_dir ?? ''} ${Math.round(weather.wind_mph)}`.trim()]);
  // Abbreviated for the cell; the full NWS wording stays in the title.
  const sky = compactSky(weather?.summary);
  if (sky) cells.push(['Sky', sky, weather?.summary ?? undefined]);
  if (phase?.next)
    cells.push([
      phase.next.type === 'H' ? 'Next high' : 'Next low',
      stationClock(phase.next.time) ?? '—',
    ]);

  return (
    <div className="cond">
      <div className="cond-hd">
        <span className="lab">Conditions now</span>
        <span className="mono" style={{ color: 'var(--m)' }}>
          {data?.station_name ?? spot.tide_station.name}
        </span>
      </div>
      <div className="cond-body">
        {status === 'loading' && (
          <div aria-busy="true">
            <div className="cond-now">
              <Skeleton width={8} />
            </div>
            <div className="cond-grid" data-cells="4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <Skeleton width={4} />
                </div>
              ))}
            </div>
            <p className="mut xs" style={{ marginTop: 10 }}>
              Checking the water…
            </p>
          </div>
        )}

        {status === 'error' && (
          <ErrorState onRetry={refetch}>
            <span>
              Live conditions did not load{error ? `: ${error}` : ''}. Everything else on this
              page works offline.
            </span>
          </ErrorState>
        )}

        {status === 'unavailable' && (
          <p className="mut">
            Live tide and weather are unavailable right now. Everything else works —
            read the stage you are on from{' '}
            <a href={spot.tide_station.url} target="_blank" rel="noreferrer">
              {spot.tide_station.name} ↗
            </a>{' '}
            and match it to <Link to="/tides">the four stages</Link>.
          </p>
        )}

        {status === 'ready' && (
          <>
            <div className="cond-now">
              {phase && <span className="chip chip-lime">{STAGE_CHIP[phase.stage]}</span>}
              {phase?.height_ft !== null && phase?.height_ft !== undefined && (
                <span className="big">
                  {phase.height_ft > 0 ? '+' : ''}
                  {phase.height_ft.toFixed(1)} ft
                </span>
              )}
              {phase?.next && (
                <span className="mut">
                  {phase.next.type === 'H' ? 'high' : 'low'} at{' '}
                  {stationClock(phase.next.time) ?? 'an unknown time'}
                  {nextIn ? `, in ${nextIn}` : ''}
                </span>
              )}
            </div>

            {position && (
              <p className="mut" style={{ marginTop: 6 }}>
                {position}
              </p>
            )}

            {data && <TideCurve tides={data.tides} phase={phase} />}

            {cells.length > 0 && (
              <div className="cond-grid" data-cells={cells.length}>
                {cells.map(([label, value, full]) => (
                  <div key={label}>
                    <span className="lab lab-xs">
                      {label}
                    </span>
                    <b title={full}>{value}</b>
                    {full && full !== value && <span className="vh">{full}</span>}
                  </div>
                ))}
              </div>
            )}

            {!phase && !weather && (
              <p className="mut">
                No reading from this station right now. Check it directly at{' '}
                <a href={spot.tide_station.url} target="_blank" rel="noreferrer">
                  NOAA ↗
                </a>
                .
              </p>
            )}
          </>
        )}

        {(status === 'ready' || (status === 'error' && data)) && (
          <div style={{ marginTop: 10 }}>
            <FreshnessNote state={freshness}>
              {spot.name} · updated {timeAgo(data?.refreshed_at)}
            </FreshnessNote>
            <p className="mut xs" style={{ marginTop: 4 }}>
              This is the station for the spot above. Tide times shift along the coast,
              so another spot reads a different one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export default function Home() {
  const locations = getLocations();
  const fish = getFishList();
  const habitats = getHabitats();
  const hazards = getHazards();

  // Two reads, and the order between them is the whole design.
  //
  // Something has to break the circle: a spot is chosen *by* a tide stage, so
  // a stage has to come from somewhere before there is a spot to read one
  // from. The reference station is that seed, and it only ever nominates.
  const reference = locations.find((l) => l.slug === REFERENCE_SLUG) ?? locations[0];
  const seed = useConditions(reference.slug);
  const seedStage = seed.status === 'ready' ? (seed.data?.phase?.stage ?? null) : null;

  // Where you are, if you offered it. Never asked for automatically, and the
  // coordinates stay on the device — see lib/geo.ts.
  const geo = useGeolocation();

  // Nearest spot by distance alone: pure arithmetic against bundled data, so
  // it resolves offline and before any network read. Its station is then the
  // one worth reading, because a tide stage from forty miles up the coast is
  // not the tide you are standing in.
  const nearest = geo.coords
    ? (rankNearby(locations, geo.coords, { stage: null, limit: 1 })[0]?.location ?? null)
    : null;
  const nearbyConditions = useConditions(nearest?.slug ?? null);
  const nearbyStage =
    nearbyConditions.status === 'ready'
      ? (nearbyConditions.data?.phase?.stage ?? null)
      : null;
  const nearbyStation =
    nearbyStage !== null
      ? (nearbyConditions.data?.station_name ?? nearest?.tide_station.name ?? null)
      : null;

  const pick = pickRecommendation(seedStage, locations);
  const pickZones = zonesFor(pick);

  // Everything the page then *reports* comes from the picked spot's own
  // station. Tide times shift along this coast by better than an hour between
  // Tampa Bay and Boca Grande, so a card headed "conditions now" sitting under
  // a card headed "go here now" has to be describing the same piece of water —
  // otherwise the screen quietly contradicts itself.
  const conditions = useConditions(pick.slug);
  const stage = conditions.status === 'ready' ? (conditions.data?.phase?.stage ?? null) : null;

  // Verified against the picked spot's OWN stage, never the seed's. The seed
  // nominated this spot; if the water where you are being sent has already
  // turned, the card must stop claiming the tide is prime there.
  const isPrime = stage ? pick.tide_playbook.prime_stages.includes(stage) : false;

  // Drives the hero's live contour. Null whenever there is no snapshot, and
  // the hero says so rather than drawing an unlabelled guess.
  const level =
    conditions.status === 'ready'
      ? tideLevel(conditions.data?.tides, conditions.data?.phase ?? null)
      : null;

  return (
    <>
      {/* The hero is a chart, not a banner. Every hairline in it is a depth
          contour through a generated bathymetry, and the one lime contour is
          the water's edge at the tide the reference station is predicting
          right now — so the picture moves through the day with the thing the
          whole guide is about. It is labelled as a schematic, because it is
          one: no location on this coast has been surveyed for this drawing.
          With no live snapshot the plate still draws, at a mid tide, and the
          caption says that instead of implying a reading. */}
      <section className="hero">
        <HeroChart level={level} />
        <div className="hero-scrim" aria-hidden="true" />
        <HeroWave />
        <div className="hero-inner">
          <p className="hero-live">
            {stage ? (
              <>
                <span className="dot" aria-hidden="true" />
                <span className="now">{STAGE_CHIP[stage]}</span>
                <span className="at">{pick.region} station</span>
              </>
            ) : (
              <span className="at">Shore fishing guide · Florida Gulf coast</span>
            )}
          </p>
          {/* The reader is an accomplished angler who has never fished salt.
              Not a beginner — displaced. The headline has to say that in his
              own terms, or it reads as an app for people who cannot fish. */}
          <h1 className="rise">
            <span className="hl-a">You know how to fish.</span>
            <span className="hl-b">
              You just don't know <em>this</em> water.
            </span>
          </h1>
          <p className="hero-sub">
            {locations.length} spots from St. Petersburg to Boca Grande Pass — where to
            stand, which tide to stand there on, what to throw, and how to hold what
            you catch without it hurting you.
          </p>
          <div className="hero-cta">
            <Link className="btn btn-lime" to="/locations">
              Find a spot
            </Link>
            <Link className="btn btn-ghost" to="/care">
              What will hurt you
            </Link>
          </div>
          <p className="hero-key">
            <span className="swatch" aria-hidden="true" />
            {level === null
              ? 'Not a chart of this spot — the lime line sits at mid tide.'
              : 'Not a chart of this spot — the lime line is the tide right now.'}
          </p>
        </div>
      </section>

      <section className="sect" aria-labelledby="nearyou">
        <h2 className="vh" id="nearyou">
          Spots near you
        </h2>
        <NearYou
          locations={locations}
          geo={geo}
          stage={nearbyStage}
          stationName={nearbyStation}
        />
      </section>

      <section className="sect" aria-labelledby="gohere">
        <SectionTitle id="gohere">Go here now</SectionTitle>
        <div className="rec">
          {/* The recommendation used to open with a photo plate, but no location
              has a licensed photograph, so it always rendered as an empty
              dashed slot. A live satellite map of the spot is the honest — and
              more useful — answer to "where am I being sent", and it is the
              same treatment the location page already uses. `key` remounts the
              map when the live tide changes which spot is recommended: Leaflet
              fixes its centre at init and would otherwise keep showing the
              previous spot. */}
          <div className="rec-map">
            <LazyMap
              key={pick.slug}
              locations={[pick]}
              center={[pick.lat, pick.lng]}
              zoom={14}
              mini
              satellite
              label={`Satellite map of ${pick.name}`}
            />
            <span className="rec-map-cap" aria-hidden="true">
              satellite · {pick.name.toLowerCase()}
            </span>
          </div>
          <div className="rec-top">
            <div className="row g2 wrap" style={{ marginBottom: 5 }}>
              <span className="chip chip-lime">
                {isPrime ? 'Prime on this tide' : 'Good place to start'}
              </span>
              <span className="chip">{pick.access.join(' · ')}</span>
            </div>
            <h3>{pick.name}</h3>
            <p className="mut">
              {pick.region} · {pick.structures.join(' · ')}
            </p>
          </div>
          <div className="rec-why">
            <div className="bar" />
            <div className="mut" style={{ color: 'var(--t)' }}>
              {stage ? (
                <>
                  {pick.tide_playbook[stage]}{' '}
                  {pickZones.length > 0 && (
                    <>
                      Structure to look for: {pickZones.map((z) => z.title.toLowerCase()).join(', ')}.{' '}
                    </>
                  )}
                </>
              ) : (
                <>
                  Best window here is <b>{pick.tide_playbook.best_window.toLowerCase()}</b>.{' '}
                </>
              )}
              Targets: {pick.targets.map((t) => t.species_label.toLowerCase()).join(', ')}.
            </div>
          </div>
          <div className="pad" style={{ paddingBottom: 'var(--s4)' }}>
            <Link className="btn btn-blue btn-block" to={`/locations/${pick.slug}`}>
              Open the location page
            </Link>
          </div>
        </div>
      </section>

      <section className="sect" aria-labelledby="conditions">
        <h2 className="vh" id="conditions">
          Conditions now at {pick.name}
        </h2>
        <ConditionsCard spot={pick} conditions={conditions} />
      </section>

      <section aria-labelledby="species">
        <div className="sect" style={{ paddingBottom: 0 }}>
          <SectionTitle id="species" to="/fish" linkLabel={`All ${fish.length}`}>
            Target species
          </SectionTitle>
        </div>
        <div className="hscroll">
          {fish.map((f) => (
            <Link className="fishcard" to={`/fish/${f.id}`} key={f.id}>
              <Plate media={f.images[0] ?? null} />
              <div className="fc-b">
                <h3>{f.name}</h3>
                <p className="mut xs">{f.habitat}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Photo ID sits directly under the species rail: the reader has just
          scrolled five fish they might have caught, and "none of these" is the
          exact moment the feature is worth offering. Labelled as a guess here
          too — the honesty rule starts at the entry point, not on the result. */}
      {/* One tap, one line. What it does is obvious from a camera with a fish
          in it; the caveats belong on the screen that gives the answer, not in
          front of someone deciding whether to tap. */}
      <section className="sect" aria-labelledby="photoid">
        <h2 className="vh" id="photoid">Identify a fish from a photo</h2>
        {/* The visible text is fragmentary — "What is it?" over a caption —
            which makes a poor accessible name on its own. */}
        <Link className="idtile" to="/id" aria-label="Identify a fish from a photo">
          <IconCameraFish />
          <span>
            <b>What is it?</b>
            <em>Photograph a fish, get a species estimate</em>
          </span>
          <Chevron />
        </Link>
      </section>

      <section className="sect" aria-labelledby="water">
        <SectionTitle id="water" to="/water" linkLabel="Read water">
          Learn the water
        </SectionTitle>
        <div className="stack g2">
          {habitats.map((h) => (
            <Link className="habcard" to="/water" key={h.id}>
              <div className="dia">
                <HabitatGlyph id={h.id} />
              </div>
              <div>
                <h3>{h.name}</h3>
                <div className="mut xs">{h.look}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="sect" aria-labelledby="areas">
        <SectionTitle id="areas" to="/locations" linkLabel={`All ${locations.length}`}>
          Spots by area
        </SectionTitle>
        <div className="card">
          {REGIONS.map((region) => {
            const inRegion = locations.filter((l) => l.region === region);
            if (inRegion.length === 0) return null;
            return (
              <Link
                className="zonerow"
                key={region}
                to={`/locations?region=${encodeURIComponent(region)}`}
              >
                <div className="row g3">
                  <span className="n">{inRegion.length}</span>
                  <div>
                    <b>{region}</b>
                    <div className="mut xs">
                      {inRegion.length === 1
                        ? inRegion[0].name
                        : inRegion
                            .slice(0, 3)
                            .map((l) => l.name.split(' / ')[0])
                            .join(' · ')}
                      {inRegion.length > 3 ? ' …' : ''}
                    </div>
                  </div>
                </div>
                <Chevron />
              </Link>
            );
          })}
        </div>
        <Link className="btn btn-ghost btn-block" to="/locations" style={{ marginTop: 'var(--s3)' }}>
          Open the map
        </Link>
      </section>

      <section className="sect" aria-labelledby="care" style={{ paddingBottom: 'var(--s7)' }}>
        <h2 className="vh" id="care">
          Handle with care
        </h2>
        <Link className="care-teaser" to="/care">
          <div>
            <div className="lab" style={{ color: 'var(--warn-text)' }}>
              Handle with care
            </div>
            <div className="care-title">
              {hazards.length} species worth knowing before you touch one
            </div>
            <div className="mut xs">
              {hazards.map((h) => h.name.split(' ').pop()?.toLowerCase()).join(' · ')}
            </div>
          </div>
          <Chevron />
        </Link>
        <Callout tone="info" className="mt3">
          Tactics on this site are local heuristics, not regulation. Check size limits, closed
          seasons and licence rules with the{' '}
          <a href="https://myfwc.com/fishing/saltwater/" target="_blank" rel="noreferrer">
            FWC
          </a>{' '}
          before you keep anything.
        </Callout>
      </section>
    </>
  );
}
