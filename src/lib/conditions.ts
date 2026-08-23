/**
 * Live-conditions contract.
 *
 * This module is the ONLY seam between the UI and Supabase-backed dynamic data.
 * The shapes and the hook signature below are a fixed contract: UI code renders
 * against them, the Supabase layer fills them in. Changing a field name here is
 * a breaking change for every screen that shows live data.
 *
 * Design rule this encodes: the guide is useful with zero network. Static guide
 * content is bundled; live conditions are strictly additive. Every consumer must
 * render something sensible for all four `status` values.
 */

export type ConditionsStatus =
  /** First load in flight — render skeletons, never a blank card. */
  | 'loading'
  /** Live snapshot in hand. Check `freshness` before presenting it as "now". */
  | 'ready'
  /** Fetch failed (offline, DNS, 5xx). Render the inline error, keep the page. */
  | 'error'
  /** Supabase is not configured for this build — live slots are simply absent. */
  | 'unavailable';

/** How much to trust a snapshot's timestamp. */
export type ConditionsFreshness = 'fresh' | 'stale' | 'offline' | 'unavailable';

/** A single NOAA CO-OPS high/low prediction. */
export interface TideEvent {
  /** 'H' = high water, 'L' = low water. */
  type: 'H' | 'L';
  /** ISO-8601 local station time. */
  time: string;
  height_ft: number;
}

/** Derived tide state at "now", used by the hero chip and the tide curve. */
export interface TidePhase {
  stage: 'low' | 'incoming' | 'high' | 'outgoing';
  /** 0..1 progress between the bracketing events; drives the curve marker. */
  progress: number;
  /** The next high/low after now, when one is known. */
  next: TideEvent | null;
  /** Interpolated height at now, feet MLLW. Null when it cannot be derived. */
  height_ft: number | null;
}

export interface WeatherNow {
  /** NWS short forecast, e.g. "Mostly Sunny". */
  summary: string | null;
  air_temp_f: number | null;
  wind_mph: number | null;
  /** Cardinal direction string as issued by NWS, e.g. "SE". */
  wind_dir: string | null;
  /** Detailed forecast text for the current period. */
  detail: string | null;
  /**
   * NWS issues wind as prose, e.g. "5 to 10 mph". `wind_mph` is the top of that
   * range; this is the string as issued, so a UI can avoid overstating a range
   * as a single number. Additive — safe to ignore.
   */
  wind_text?: string | null;
  /** Which NWS period this is, e.g. "Today", "Tonight". Additive. */
  period_name?: string | null;
}

export interface ConditionsSnapshot {
  location_slug: string;
  /** NOAA CO-OPS station backing the tide data, when the location has one. */
  station_id: string | null;
  station_name: string | null;
  /** NOAA station page for that station, when known. Additive. */
  station_url?: string | null;
  /** When the Edge Function last wrote this data. ISO-8601. */
  refreshed_at: string | null;
  tides: TideEvent[];
  phase: TidePhase | null;
  weather: WeatherNow | null;
  /** Attribution/provenance links for what is shown. */
  sources: Array<{ label: string; url: string }>;
}

export interface ConditionsResult {
  status: ConditionsStatus;
  data: ConditionsSnapshot | null;
  freshness: ConditionsFreshness;
  error: string | null;
  /** Re-runs the fetch. Safe to call from a retry button. */
  refetch: () => void;
}

/** A snapshot older than this is shown, but labelled as stale. */
export const STALE_AFTER_MS = 6 * 60 * 60 * 1000;

/** Human-readable "x ago" for provenance lines. */
/**
 * Condenses an NWS `shortForecast` to something that fits a stat cell.
 *
 * "Short" is relative: NWS routinely issues strings like "Isolated Showers And
 * Thunderstorms", which is five times wider than the ~80px cell the conditions
 * grid gives it. Callers must keep the full string available as a title and to
 * assistive tech — this is a display abbreviation, not a replacement.
 *
 * Ordered most-severe first, because a forecast naming both cloud state and
 * storms should condense to the storms.
 */
export function compactSky(summary: string | null | undefined): string | null {
  if (!summary) return null;
  const s = summary.toLowerCase();
  if (s.includes('thunder')) return 'Storms';
  if (s.includes('rain') || s.includes('shower') || s.includes('drizzle')) return 'Showers';
  if (s.includes('fog') || s.includes('haze')) return 'Fog';
  if (s.includes('wind')) return 'Windy';
  if (s.includes('mostly cloudy') || s.includes('overcast')) return 'Cloudy';
  if (s.includes('partly cloudy') || s.includes('partly sunny')) return 'Part cloud';
  if (s.includes('mostly sunny') || s.includes('mostly clear')) return 'Mostly sun';
  if (s.includes('cloud')) return 'Cloudy';
  if (s.includes('sunny')) return 'Sunny';
  if (s.includes('clear')) return 'Clear';
  // Unrecognised: first word beats a clipped sentence.
  return summary.split(/\s+/)[0];
}

/**
 * Format an NWS/CO-OPS timestamp as a station-local clock reading, e.g.
 * "6:42 am". Used anywhere a specific tide or forecast moment needs to read
 * as a time a person can act on, not just a relative age.
 */
export function stationClock(iso: string): string | null {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return null;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'am' : 'pm'}`;
}

/**
 * How long until `iso`, as a short duration: "48 min", "2 hr 10 min".
 *
 * Returns null for a moment that has already passed, so a caller can never
 * render "in -5 min" off a snapshot that aged past its own next event.
 */
export function countdown(iso: string | null | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  const mins = Math.round((then - now) / 60000);
  if (mins < 0) return null;
  if (mins < 1) return 'any minute';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs} hr ${rem} min`;
}

/**
 * States the current water level *relative to the turns that bracket it*.
 *
 * A tide curve on its own is a wave with no scale: it shows shape but not
 * where you are in the swing, which is the one thing the card exists to tell
 * you. "+1.4 ft" has the same problem — a number with no reference is not a
 * reading. This composes the two into the sentence an angler actually wants:
 * how far the water has moved off the last turn, and how far it has left to
 * go before the next one.
 *
 * Pure and total, like everything else here: any gap in the data yields null
 * rather than a half-sentence. Every value is a NOAA prediction, and the
 * caller's surrounding copy must keep saying so.
 */
export function describeTidePosition(
  tides: TideEvent[],
  phase: TidePhase | null,
  now = Date.now(),
): string | null {
  if (!phase || phase.height_ft === null) return null;

  const dated = tides
    .map((t) => ({ ...t, ms: Date.parse(t.time) }))
    .filter((t) => Number.isFinite(t.ms))
    .sort((a, b) => a.ms - b.ms);

  let prev: (typeof dated)[number] | null = null;
  let next: (typeof dated)[number] | null = null;
  for (const e of dated) {
    if (e.ms <= now) prev = e;
    else {
      next = e;
      break;
    }
  }
  if (!prev || !next) return null;

  const ft = (n: number) => `${Math.abs(n).toFixed(1)} ft`;
  const turn = (e: TideEvent) => (e.type === 'H' ? 'high' : 'low');
  const at = (e: TideEvent) => stationClock(e.time);
  const prevAt = at(prev);
  const nextAt = at(next);
  if (!prevAt || !nextAt) return null;

  const swing = Math.abs(next.height_ft - prev.height_ft);

  // Inside a slack window the water is not meaningfully moving, so the useful
  // fact is which turn you are sitting on and how big the swing either side is.
  if (phase.stage === 'high' || phase.stage === 'low') {
    const where = phase.stage === 'high' ? 'top' : 'bottom';
    return `Sitting at the ${where} of a ${ft(swing)} swing — ${turn(prev)} was ${prevAt}, ${turn(next)} is ${nextAt}.`;
  }

  const moved = phase.height_ft - prev.height_ft;
  const left = next.height_ft - phase.height_ft;
  const rising = phase.stage === 'incoming';
  return `${ft(moved)} ${rising ? 'up' : 'down'} from the ${prevAt} ${turn(prev)}, ${ft(left)} ${rising ? 'below' : 'above'} the ${nextAt} ${turn(next)} — a ${ft(swing)} swing.`;
}

export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'unknown';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 'unknown';
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function freshnessOf(
  refreshedAt: string | null | undefined,
  now = Date.now(),
): ConditionsFreshness {
  if (!refreshedAt) return 'unavailable';
  const then = Date.parse(refreshedAt);
  if (Number.isNaN(then)) return 'unavailable';
  return now - then > STALE_AFTER_MS ? 'stale' : 'fresh';
}

/* ===========================================================================
   Payload parsing.

   Everything below turns an untrusted `jsonb` blob — whatever NOAA CO-OPS or
   the NWS happened to return, as stored verbatim by the refresh-conditions
   Edge Function — into the typed shapes above. These functions are pure and
   total: a missing, malformed or hostile field yields null, never a throw.
   =========================================================================== */

/**
 * Fallback timezone for CO-OPS timestamps. Every GCF tide station is in
 * Florida. The Edge Function stamps the real zone into `payload.shorebound_meta`;
 * this only covers a snapshot written before that sidecar existed.
 */
export const DEFAULT_STATION_TZ = 'America/New_York';

/** How close to a turn still counts as "high" / "low" rather than a limb. */
const SLACK_MS = 45 * 60 * 1000;
const SLACK_FRACTION = 0.15;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asString = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() !== '' ? v : null;

/** Accepts JSON numbers and the numeric *strings* CO-OPS actually sends. */
const asNumber = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Minutes that `timeZone` is offset from UTC at the given instant.
 * Positive east of Greenwich; America/New_York is -300 (EST) or -240 (EDT).
 */
function tzOffsetMinutes(utcMs: number, timeZone: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(utcMs));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const hour = get('hour') === 24 ? 0 : get('hour'); // some engines emit "24"
    const asIfUtc = Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      hour,
      get('minute'),
      get('second'),
    );
    if (!Number.isFinite(asIfUtc)) return 0;
    return Math.round((asIfUtc - utcMs) / 60000);
  } catch {
    // Unknown/!unsupported zone id — fall back to treating it as UTC rather
    // than throwing out of a parser.
    return 0;
  }
}

const NAIVE_LOCAL = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Resolves a bare station-local wall-clock string to a real UTC instant.
 *
 * CO-OPS is queried with `time_zone=lst_ldt`, so it returns timestamps like
 * `"2026-08-10 10:35"` with no offset at all. Parsing those with `Date.parse`
 * would silently interpret them in the *viewer's* timezone, which is wrong for
 * anyone not in Florida. We resolve them against the station's zone instead.
 *
 * The two-pass offset lookup handles the DST boundary: the first guess uses the
 * offset in force at the naive time read as UTC, the second re-reads the offset
 * at the resulting instant and corrects if the transition moved it.
 */
export function stationTimeToMs(naive: string, timeZone: string): number | null {
  const m = NAIVE_LOCAL.exec(naive.trim());
  if (!m) {
    // Already offset-qualified (or otherwise ISO) — let the platform have it.
    const direct = Date.parse(naive);
    return Number.isNaN(direct) ? null : direct;
  }
  const [, y, mo, d, h, mi, s] = m;
  const asUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, s ? +s : 0);
  if (!Number.isFinite(asUtc)) return null;
  const first = tzOffsetMinutes(asUtc, timeZone);
  let ms = asUtc - first * 60000;
  const second = tzOffsetMinutes(ms, timeZone);
  if (second !== first) ms = asUtc - second * 60000;
  return ms;
}

/** Formats an instant as ISO-8601 in `timeZone`, offset included. */
export function msToStationIso(ms: number, timeZone: string): string {
  const off = tzOffsetMinutes(ms, timeZone);
  const local = new Date(ms + off * 60000);
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

/** A TideEvent plus the resolved instant, so callers do not re-parse. */
interface DatedEvent extends TideEvent {
  ms: number;
}

/**
 * Parses a stored CO-OPS `interval=hilo` predictions payload.
 *
 * Returns events sorted ascending, with `time` rewritten as offset-qualified
 * ISO-8601 in the station's local zone — unambiguous everywhere, and still
 * "local station time" as the contract requires.
 */
export function parseTidePredictions(payload: unknown): TideEvent[] {
  return parseDatedPredictions(payload).map(({ type, time, height_ft }) => ({
    type,
    time,
    height_ft,
  }));
}

function parseDatedPredictions(payload: unknown): DatedEvent[] {
  if (!isRecord(payload)) return [];
  const raw = payload.predictions;
  if (!Array.isArray(raw)) return [];

  // `gcf_meta` is the pre-rename spelling. Snapshots live for three hours,
  // so both appear in the wild briefly after a deploy; reading either means
  // the rename never costs a reader their tide times. Drop the fallback
  // once every stored snapshot has turned over.
  const rawMeta = payload.shorebound_meta ?? payload.gcf_meta;
  const meta = isRecord(rawMeta) ? rawMeta : null;
  const tz = (meta && asString(meta.station_tz)) || DEFAULT_STATION_TZ;

  const out: DatedEvent[] = [];
  for (const entry of raw) {
    if (!isRecord(entry)) continue;
    const t = asString(entry.t);
    const height = asNumber(entry.v);
    const rawType = asString(entry.type)?.toUpperCase();
    if (!t || height === null) continue;
    if (rawType !== 'H' && rawType !== 'L') continue;
    const ms = stationTimeToMs(t, tz);
    if (ms === null) continue;
    out.push({ type: rawType, time: msToStationIso(ms, tz), height_ft: height, ms });
  }
  out.sort((a, b) => a.ms - b.ms);
  return out;
}

/**
 * Derives the tide stage at `now` from hi/lo predictions.
 *
 * Method: bracket `now` between the last prediction at or before it and the
 * first one after it. `progress` is the linear position between those two.
 * Height is interpolated with a raised cosine, the standard smooth
 * approximation to a semi-diurnal curve (and the continuous form of the old
 * "rule of twelfths"): flat at the turns, fastest at mid-tide.
 *
 * Naming: within a slack window of a turn the stage is that turn ("high" /
 * "low"); elsewhere it is the limb ("incoming" / "outgoing"). The window is
 * 15% of the interval, capped at 45 minutes, so a short interval between two
 * closely spaced events does not read as slack for its whole length.
 */
export function derivePhase(payload: unknown, now = Date.now()): TidePhase | null {
  const events = parseDatedPredictions(payload);
  if (events.length === 0) return null;

  let prev: DatedEvent | null = null;
  let next: DatedEvent | null = null;
  for (const e of events) {
    if (e.ms <= now) prev = e;
    else {
      next = e;
      break;
    }
  }

  const strip = (e: DatedEvent): TideEvent => ({
    type: e.type,
    time: e.time,
    height_ft: e.height_ft,
  });

  // Only one side known — we can name a direction but not a position on it.
  if (!prev || !next) {
    const known = prev ?? next!;
    const rising = prev ? known.type === 'L' : known.type === 'H';
    return {
      stage: rising ? 'incoming' : 'outgoing',
      progress: prev ? 1 : 0,
      next: next ? strip(next) : null,
      height_ft: null,
    };
  }

  const span = next.ms - prev.ms;
  const progress = span > 0 ? Math.min(1, Math.max(0, (now - prev.ms) / span)) : 0;

  // Two events of the same type back to back happen at mixed-tide stations;
  // the heights still tell us which way the water is going.
  const rising =
    prev.type === next.type ? next.height_ft > prev.height_ft : prev.type === 'L';

  const slack = Math.min(SLACK_MS, span * SLACK_FRACTION);
  let stage: TidePhase['stage'];
  if (now - prev.ms <= slack) stage = prev.type === 'H' ? 'high' : 'low';
  else if (next.ms - now <= slack) stage = next.type === 'H' ? 'high' : 'low';
  else stage = rising ? 'incoming' : 'outgoing';

  const eased = (1 - Math.cos(Math.PI * progress)) / 2;
  const height = prev.height_ft + (next.height_ft - prev.height_ft) * eased;

  return {
    stage,
    progress,
    next: strip(next),
    height_ft: Number.isFinite(height) ? Math.round(height * 100) / 100 : null,
  };
}

/** "5 to 10 mph" -> 10; "7 mph" -> 7; anything unparseable -> null. */
function parseWindMph(text: string | null): number | null {
  if (!text) return null;
  const numbers = text.match(/\d+(?:\.\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  const values = numbers.map(Number).filter((n) => Number.isFinite(n));
  if (values.length === 0) return null;
  return Math.max(...values);
}

/**
 * Parses a stored NWS gridpoint forecast into the current period.
 *
 * "Current" means the period whose [startTime, endTime) contains `now`; if none
 * does (a snapshot that has aged past its own first period), the first period
 * is used. Either way this is a FORECAST, never an observation.
 */
export function parseNwsForecast(payload: unknown, now = Date.now()): WeatherNow | null {
  if (!isRecord(payload)) return null;
  const props = isRecord(payload.properties) ? payload.properties : null;
  const periods = props && Array.isArray(props.periods) ? props.periods : null;
  if (!periods || periods.length === 0) return null;

  const usable = periods.filter(isRecord);
  if (usable.length === 0) return null;

  const current =
    usable.find((p) => {
      const start = Date.parse(asString(p.startTime) ?? '');
      const end = Date.parse(asString(p.endTime) ?? '');
      return !Number.isNaN(start) && !Number.isNaN(end) && now >= start && now < end;
    }) ?? usable[0];

  const unit = asString(current.temperatureUnit)?.toUpperCase();
  const rawTemp = asNumber(current.temperature);
  const air_temp_f =
    rawTemp === null ? null : unit === 'C' ? Math.round((rawTemp * 9) / 5 + 32) : rawTemp;

  const windText = asString(current.windSpeed);

  const parsed: WeatherNow = {
    summary: asString(current.shortForecast),
    air_temp_f,
    wind_mph: parseWindMph(windText),
    wind_dir: asString(current.windDirection),
    detail: asString(current.detailedForecast),
    wind_text: windText,
    period_name: asString(current.name),
  };

  // A period that yielded nothing usable is worth less than an honest absence:
  // returning it would make the UI render a card of empty dashes.
  const hasAnything =
    parsed.summary !== null ||
    parsed.air_temp_f !== null ||
    parsed.wind_mph !== null ||
    parsed.wind_dir !== null ||
    parsed.detail !== null;
  return hasAnything ? parsed : null;
}
