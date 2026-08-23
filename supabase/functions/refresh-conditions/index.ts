// =============================================================================
// Shorebound `refresh-conditions` Edge Function — DEPLOYED, scheduled every 3 hours.
// =============================================================================
//
// What it does on each run:
//   1. Reads all locations (slug, lat, lng, tide_station_id) and their distinct
//      NOAA tide stations from the database.
//   2. Fetches NOAA CO-OPS high/low tide predictions for each station
//      (api.tidesandcurrents.noaa.gov) and inserts a row into tide_snapshots.
//   3. Fetches NWS forecasts for each location (api.weather.gov), deduplicating
//      both the /points lookup and the gridpoint forecast so nearby spots share
//      one fetch, and inserts a row per location into weather_snapshots.
//   4. Prunes snapshot rows older than RETENTION_DAYS.
//
// Clients read only the `tide_latest` / `weather_latest` views (anon SELECT via
// RLS). All writes here use the service-role key, which is injected into the
// Edge Function runtime by Supabase and never ships to the client.
//
// External API etiquette:
//   - NWS requires a User-Agent identifying the app and a contact
//     (https://www.weather.gov/documentation/services-web-api). NWS data is US
//     Government work in the public domain.
//   - CO-OPS asks for an `application` parameter identifying the caller
//     (https://api.tidesandcurrents.noaa.gov/api/prod/). No API key required.
//   - Requests run sequentially with a small delay; transient 429/5xx get a
//     bounded backoff retry rather than a hammering loop. A 3-hourly cadence is
//     far below any published limit for either service.
//
// Everything served here is a PREDICTION or a FORECAST, never an observation.
// The client labels it as such; do not add products that blur that line.

import { createClient } from "npm:@supabase/supabase-js@2";

const NWS_USER_AGENT = "(shorebound shore fishing guide, support@shorebound.app)";
const COOPS_APP = "shorebound";
const RETENTION_DAYS = 7;
const FETCH_DELAY_MS = 250;
const MAX_ATTEMPTS = 3;

/**
 * Every Shorebound tide station is in Florida, i.e. America/New_York. CO-OPS is queried
 * with time_zone=lst_ldt, so the `t` values it returns are bare station-local
 * wall-clock strings with no offset. We stamp the zone into the stored payload
 * under `shorebound_meta` so the client can resolve those strings to real instants
 * without hardcoding a zone of its own.
 */
const STATION_TZ = "America/New_York";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch JSON with a bounded retry on transport errors and transient statuses. */
async function fetchJson(url: string, headers: Record<string, string> = {}) {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return await res.json();
      // 429 / 5xx are worth one more try; 4xx are not going to change.
      const retryable = res.status === 429 || res.status >= 500;
      lastError = new Error(`${res.status} ${res.statusText} for ${url}`);
      if (!retryable || attempt === MAX_ATTEMPTS) throw lastError;
    } catch (e) {
      lastError = e as Error;
      if (attempt === MAX_ATTEMPTS) throw lastError;
    }
    await sleep(FETCH_DELAY_MS * attempt * 2);
  }
  throw lastError ?? new Error(`failed to fetch ${url}`);
}

/**
 * `yyyymmdd` for "today minus `daysBack`" in the station's local calendar.
 *
 * Uses Intl rather than Date component getters so the answer does not depend on
 * the Edge runtime's own TZ (which is UTC, and therefore already a day ahead of
 * Eastern for several hours each night).
 */
function stationDate(daysBack = 0): string {
  const at = new Date(Date.now() - daysBack * 86_400_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: STATION_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at); // en-CA formats as YYYY-MM-DD
  return parts.replaceAll("-", "");
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = new Date().toISOString();
  const summary = {
    started_at: startedAt,
    tide_stations_refreshed: [] as string[],
    weather_locations_refreshed: [] as string[],
    errors: [] as string[],
  };

  const { data: locations, error: locErr } = await supabase
    .from("locations")
    .select("slug, lat, lng, tide_station_id");
  if (locErr) {
    return Response.json({ error: locErr.message }, { status: 500 });
  }

  // ------------------------------------------------------------------ tides
  const stationIds = [
    ...new Set((locations ?? []).map((l) => l.tide_station_id).filter(Boolean)),
  ] as string[];

  // Start the window YESTERDAY, not today. The client derives "which stage is
  // it right now" by bracketing `now` between two predictions, and these are
  // mostly mixed/diurnal stations where the first event of a calendar day can
  // fall as late as ~10:30 local. Beginning at midnight today would leave the
  // whole morning with no preceding event and no derivable phase.
  // Hours of predictions to request, counting from `beginDate`. One of those
  // days is yesterday (see above), so forward coverage is this minus ~24h.
  //
  // Was 96, which spent half the window on the past and left barely 40 hours
  // ahead — not enough to answer "when should I go this weekend", which is the
  // question the forecast exists for. CO-OPS serves astronomical predictions
  // far further out than this at no extra cost, and hi/lo is only a handful of
  // rows per day, so the payload stays trivial.
  const TIDE_RANGE_HOURS = 192;

  const beginDate = stationDate(1);

  for (const stationId of stationIds) {
    // interval=hilo works for both reference and subordinate stations; most of
    // the stations are subordinate (high/low predictions only).
    const url =
      "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter" +
      `?product=predictions&application=${COOPS_APP}&station=${stationId}` +
      `&begin_date=${beginDate}&range=${TIDE_RANGE_HOURS}&datum=MLLW&time_zone=lst_ldt` +
      "&units=english&interval=hilo&format=json";
    try {
      const payload = await fetchJson(url);
      // CO-OPS reports failures as HTTP 200 with an {error:{message}} body.
      if (payload?.error?.message) {
        throw new Error(`CO-OPS: ${payload.error.message}`);
      }
      if (!Array.isArray(payload?.predictions) || payload.predictions.length === 0) {
        throw new Error(`no predictions in CO-OPS response for ${stationId}`);
      }
      const { error } = await supabase.from("tide_snapshots").insert({
        station_id: stationId,
        payload: {
          ...payload,
          // Namespaced sidecar: the timestamps above carry no offset, so record
          // the zone they are expressed in alongside them.
          shorebound_meta: {
            station_tz: STATION_TZ,
            time_zone_param: "lst_ldt",
            datum: "MLLW",
            units: "english",
            interval: "hilo",
            kind: "prediction",
            fetched_at: new Date().toISOString(),
          },
        },
        source_url: url,
      });
      if (error) throw new Error(error.message);
      summary.tide_stations_refreshed.push(stationId);
    } catch (e) {
      summary.errors.push(`tide ${stationId}: ${(e as Error).message}`);
    }
    await sleep(FETCH_DELAY_MS);
  }

  // ---------------------------------------------------------------- weather
  // NWS flow: /points/{lat},{lng} -> gridpoint forecast URL. Nearby locations
  // often share a gridpoint, so cache both hops: the points lookup by rounded
  // coordinate, and the forecast by gridpoint URL.
  const nwsHeaders = {
    "User-Agent": NWS_USER_AGENT,
    Accept: "application/geo+json",
  };
  const pointsCache = new Map<string, string>();
  const forecastCache = new Map<string, unknown>();

  for (const loc of locations ?? []) {
    try {
      if (typeof loc.lat !== "number" || typeof loc.lng !== "number") {
        throw new Error("location has no coordinates");
      }
      // NWS rejects more than 4 decimal places on /points.
      const coord = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;

      let forecastUrl = pointsCache.get(coord);
      if (!forecastUrl) {
        const pointsUrl = `https://api.weather.gov/points/${coord}`;
        const points = await fetchJson(pointsUrl, nwsHeaders);
        forecastUrl = points?.properties?.forecast;
        if (!forecastUrl) throw new Error(`no forecast URL from ${pointsUrl}`);
        pointsCache.set(coord, forecastUrl);
        await sleep(FETCH_DELAY_MS);
      }

      let forecast = forecastCache.get(forecastUrl);
      if (!forecast) {
        forecast = await fetchJson(forecastUrl, nwsHeaders);
        if (!Array.isArray((forecast as any)?.properties?.periods)) {
          throw new Error(`no forecast periods from ${forecastUrl}`);
        }
        forecastCache.set(forecastUrl, forecast);
        await sleep(FETCH_DELAY_MS);
      }

      const { error } = await supabase.from("weather_snapshots").insert({
        location_slug: loc.slug,
        kind: "forecast",
        payload: forecast,
        source_url: forecastUrl,
      });
      if (error) throw new Error(error.message);
      summary.weather_locations_refreshed.push(loc.slug);
    } catch (e) {
      summary.errors.push(`weather ${loc.slug}: ${(e as Error).message}`);
    }
  }

  // -------------------------------------------------------------- retention
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  for (const table of ["tide_snapshots", "weather_snapshots"]) {
    const { error } = await supabase.from(table).delete().lt("refreshed_at", cutoff);
    if (error) summary.errors.push(`prune ${table}: ${error.message}`);
  }

  const status = summary.errors.length ? 207 : 200;
  return Response.json(summary, { status });
});
