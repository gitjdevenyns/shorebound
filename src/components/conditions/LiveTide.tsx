import { useMemo } from 'react';
import type { Location } from '../../data';
import { useConditions } from '../../lib/useConditions';
import {
  compactSky,
  countdown,
  describeTidePosition,
  stationClock,
  timeAgo,
} from '../../lib/conditions';
import type { TideEvent } from '../../lib/conditions';
import { useSlotWidth } from '../../lib/useSlotWidth';
import { ErrorState, FreshnessNote, Skeleton } from '../ui';

/**
 * Live tide + forecast card for one location, read from the Supabase snapshot
 * cache (NOAA CO-OPS predictions and the NWS forecast, refreshed every 3 hours
 * by the refresh-conditions Edge Function).
 *
 * Everything here is a PREDICTION or a FORECAST, never an observation, and the
 * copy says so. The card renders in all four `useConditions` states and never
 * blanks: with no live data at all it still tells the angler which station to
 * open and what this spot's tide plan is.
 */

const STAGE_COPY: Record<string, { label: string; note: string }> = {
  low: { label: 'Low / slack', note: 'Water is off the flat. Fish the remaining depth.' },
  incoming: { label: 'Incoming', note: 'Water is filling. Follow it shoreward.' },
  high: { label: 'High / slack', note: 'Flooded and spread out. Read structure, not depth.' },
  outgoing: { label: 'Outgoing', note: 'The flat is draining. Sit down-current of an exit.' },
};

/** Station-local clock, or an em dash when the timestamp is unreadable. */
const clock = (iso: string): string => stationClock(iso) ?? '—';

/**
 * Tide curve driven by the real predicted heights.
 *
 * A smooth curve through hi/lo points is the honest shape: the tide is
 * sinusoidal between turns, so a straight-line join would understate mid-tide
 * current — which is the single thing this whole screen is trying to teach.
 *
 * Drawn into a viewBox sized to the measured slot rather than a fixed one
 * scaled to fit, so the axis type renders at its true size on a wide screen
 * instead of growing with the card. See `useSlotWidth`.
 */

/** Fallback drawing width, and the narrowest the chart is ever laid out at. */
const MIN_W = 358;
/** Side gutter, so the first and last label never sit against the edge. */
const PAD = 20;
const BASELINE = 152;
const CHART_H = 176;
/** Narrowest gap, in px, two axis labels can sit at without colliding. */
const LABEL_GAP = 64;

function Curve({ events, nowMs }: { events: TideEvent[]; nowMs: number }) {
  const { ref, width } = useSlotWidth(MIN_W);
  const W = Math.max(MIN_W, Math.round(width));

  const geometry = useMemo(() => {
    const pts = events
      .map((e) => ({ ...e, ms: Date.parse(e.time) }))
      .filter((e) => Number.isFinite(e.ms))
      .sort((a, b) => a.ms - b.ms);
    if (pts.length < 2) return null;

    // Window: the event before now, plus everything in the next 36 hours.
    // Bounded by elapsed time rather than by a count of turns — Gulf stations
    // run mixed and sometimes diurnal, so a fixed six events is a day and a
    // half at one station and three days at another, and the three-day case
    // is an unreadable squiggle with a dozen times stacked along the axis.
    const FORECAST_MS = 36 * 60 * 60 * 1000;
    const startIdx = Math.max(0, pts.findIndex((p) => p.ms > nowMs) - 1);
    const window = pts
      .slice(startIdx)
      .filter((p, i) => i === 0 || p.ms <= nowMs + FORECAST_MS);
    if (window.length < 2) return null;

    const t0 = window[0].ms;
    const t1 = window[window.length - 1].ms;
    const span = t1 - t0 || 1;
    const heights = window.map((p) => p.height_ft);
    const lo = Math.min(...heights);
    const hi = Math.max(...heights);
    const range = hi - lo || 1;

    const X = (ms: number) => PAD + ((ms - t0) / span) * (W - PAD * 2);
    const Y = (ft: number) => 138 - ((ft - lo) / range) * 96;

    // Horizontal-tangent cubics: flat at each turn, steepest between them.
    let d = `M ${X(window[0].ms).toFixed(1)} ${Y(window[0].height_ft).toFixed(1)}`;
    for (let i = 1; i < window.length; i++) {
      const a = window[i - 1];
      const b = window[i];
      const ax = X(a.ms);
      const bx = X(b.ms);
      const cx = ax + (bx - ax) / 2;
      d += ` C ${cx.toFixed(1)} ${Y(a.height_ft).toFixed(1)}, ${cx.toFixed(1)} ${Y(b.height_ft).toFixed(1)}, ${bx.toFixed(1)} ${Y(b.height_ft).toFixed(1)}`;
    }

    // Thin the times when the slot is too narrow to hold every turn. The dot
    // stays at every event either way, so a dropped label never hides a turn.
    const labelled: typeof window = [];
    for (const p of window) {
      const last = labelled[labelled.length - 1];
      if (!last || X(p.ms) - X(last.ms) >= LABEL_GAP) labelled.push(p);
    }
    const finalPt = window[window.length - 1];
    if (labelled[labelled.length - 1] !== finalPt) {
      while (
        labelled.length > 0 &&
        X(finalPt.ms) - X(labelled[labelled.length - 1].ms) < LABEL_GAP
      ) {
        labelled.pop();
      }
      labelled.push(finalPt);
    }

    const nowX = nowMs >= t0 && nowMs <= t1 ? X(nowMs) : null;
    return { d, window, labelled, X, Y, nowX };
  }, [events, nowMs, W]);

  if (!geometry) return null;
  const { d, window, labelled, Y, X, nowX } = geometry;

  return (
    <div ref={ref}>
      <svg
        viewBox={`0 0 ${W} ${CHART_H}`}
        style={{ display: 'block', width: '100%', height: CHART_H }}
        role="img"
        aria-label={`Predicted tide curve for the next 36 hours: ${window
          .map((p) => `${p.type === 'H' ? 'high' : 'low'} ${p.height_ft.toFixed(1)} feet at ${clock(p.time)}`)
          .join(', ')}`}
      >
        <path
          d={`${d} L ${W - PAD} ${BASELINE} L ${PAD} ${BASELINE} Z`}
          style={{ fill: 'var(--accent)', opacity: 0.24 }}
        />
        <path
          d={d}
          fill="none"
          strokeWidth="2.6"
          strokeLinecap="round"
          style={{ stroke: 'var(--link)' }}
        />
        <path d={`M${PAD - 8} ${BASELINE} H${W - PAD + 8}`} strokeWidth="1.5" style={{ stroke: 'var(--l2)' }} />
        {window.map((p) => (
          <circle key={p.time} cx={X(p.ms)} cy={Y(p.height_ft)} r="4" style={{ fill: 'var(--link)' }} />
        ))}
        {labelled.map((p) => (
          <text
            key={p.time}
            x={X(p.ms)}
            y={p.type === 'H' ? Y(p.height_ft) - 10 : Y(p.height_ft) + 18}
            textAnchor="middle"
            fontFamily="var(--ff-mono)"
            fontSize="9"
            fontWeight="800"
            style={{ fill: 'var(--m)' }}
          >
            {p.type === 'H' ? 'H' : 'L'} {clock(p.time)}
          </text>
        ))}
        {nowX !== null && (
          <>
            <line
              x1={nowX}
              y1="14"
              x2={nowX}
              y2={BASELINE}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              style={{ stroke: 'var(--lime)' }}
            />
            <text
              x={nowX}
              y="10"
              textAnchor="middle"
              fontFamily="var(--ff-mono)"
              fontSize="9"
              fontWeight="800"
              letterSpacing=".1em"
              style={{ fill: 'var(--lime-text)' }}
            >
              NOW
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export default function LiveTide({ location }: { location: Location }) {
  const { status, data, freshness, error, refetch } = useConditions(location.slug);
  const nowMs = Date.now();
  const phase = data?.phase ?? null;
  const stage = phase?.stage ?? null;
  const weather = data?.weather ?? null;
  // Where the water sits between the turns either side of it, and how long
  // until the next one. The curve shows the shape of the swing; these say
  // where in it you are standing, which is what the card is actually for.
  const position = data ? describeTidePosition(data.tides, phase, nowMs) : null;
  const nextIn = phase?.next ? countdown(phase.next.time, nowMs) : null;

  return (
    <div className="cond">
      <div className="cond-hd">
        <span className="lab">Conditions now</span>
        <span className="mono" style={{ color: 'var(--m)' }}>
          {location.tide_station.name?.replace(/^NOAA /, '') ?? 'NOAA'}
        </span>
      </div>

      <div className="cond-body">
        {status === 'loading' && (
          <div aria-busy="true" aria-live="polite">
            <span className="vh">Loading current conditions</span>
            <div className="cond-now">
              <Skeleton width={8} />
              <Skeleton width={6} />
            </div>
            <div style={{ marginTop: 10 }}>
              <Skeleton block />
            </div>
          </div>
        )}

        {status === 'error' && !data && (
          <ErrorState onRetry={refetch}>
            <span>
              The cached tide and forecast could not be loaded
              {error ? ` (${error})` : ''}. Everything else on this page works without
              it — open the station chart below for the official prediction.
            </span>
          </ErrorState>
        )}

        {status === 'unavailable' && (
          <p className="mut">
            Live conditions are unavailable right now. The tide stages and the
            per-spot plans below do not need them.
          </p>
        )}

        {(status === 'ready' || (status === 'error' && data)) && data && (
          <>
            <div className="cond-now">
              {stage ? (
                <span className="chip chip-lime">{STAGE_COPY[stage]?.label ?? stage}</span>
              ) : (
                <span className="chip">Tide stage unknown</span>
              )}
              {phase?.height_ft !== null && phase?.height_ft !== undefined && (
                <span className="big">{phase.height_ft.toFixed(1)} ft</span>
              )}
              {phase?.next && (
                <span className="mut">
                  {phase.next.type === 'H' ? 'high' : 'low'} at {clock(phase.next.time)}
                  {nextIn ? `, in ${nextIn}` : ''}
                </span>
              )}
            </div>

            {position && <p className="mut">{position}</p>}

            {stage && <p className="mut">{STAGE_COPY[stage]?.note}</p>}

            {data.tides.length > 1 && (
              <div style={{ marginTop: 10 }}>
                <Curve events={data.tides} nowMs={nowMs} />
              </div>
            )}

            <div className="cond-grid">
              <div>
                <span className="lab lab-xs">
                  Wind
                </span>
                <b>
                  {weather?.wind_mph !== null && weather?.wind_mph !== undefined
                    ? `${weather.wind_dir ?? ''} ${weather.wind_mph}`.trim()
                    : '—'}
                </b>
              </div>
              <div>
                <span className="lab lab-xs">
                  Air
                </span>
                <b>
                  {weather?.air_temp_f !== null && weather?.air_temp_f !== undefined
                    ? `${weather.air_temp_f}°`
                    : '—'}
                </b>
              </div>
              <div>
                <span className="lab lab-xs">
                  Sky
                </span>
                <b title={weather?.summary ?? undefined}>
                  {compactSky(weather?.summary) ?? '—'}
                </b>
                {weather?.summary && <span className="vh">{weather.summary}</span>}
              </div>
              <div>
                <span className="lab lab-xs">
                  Range
                </span>
                <b>
                  {data.tides.length > 1
                    ? `${(
                        Math.max(...data.tides.map((t) => t.height_ft)) -
                        Math.min(...data.tides.map((t) => t.height_ft))
                      ).toFixed(1)} ft`
                    : '—'}
                </b>
              </div>
            </div>

            <FreshnessNote state={freshness}>
              {freshness === 'stale'
                ? `Cached ${timeAgo(data.refreshed_at)} — may be out of date.`
                : `Predicted values, cached ${timeAgo(data.refreshed_at)}.`}{' '}
              Wind and sky are an NWS forecast; tide heights are NOAA astronomical
              predictions, not measurements.
            </FreshnessNote>

            {status === 'error' && (
              <p className="mut xs" style={{ marginTop: 6 }}>
                Showing the last good copy — refresh failed.{' '}
                <button
                  type="button"
                  className="iconbtn"
                  onClick={refetch}
                  style={{ minHeight: 28 }}
                >
                  Retry
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
