/**
 * Supabase client + the live-conditions read.
 *
 * Only two things ever come from Supabase: the cached NOAA tide predictions and
 * the cached NWS forecast, both written by the `refresh-conditions` Edge
 * Function and exposed through the `tide_latest` / `weather_latest` views. The
 * client reads with the anon key, which is a publishable key and is meant to be
 * in the bundle; RLS grants anon SELECT and nothing else. The service-role key
 * must never appear in this codebase, in any VITE_-prefixed variable, or in a
 * commit.
 *
 * Supabase is optional by design — the guide is fully useful with zero network,
 * so an unconfigured build simply resolves to `unavailable` rather than failing.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ConditionsSnapshot } from './conditions';
import { derivePhase, parseNwsForecast, parseTidePredictions } from './conditions';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (from .env.local in dev,
 * or repo Actions secrets/vars at CI build time). Returns null when not
 * configured — callers must treat Supabase as optional.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export const isSupabaseConfigured = (): boolean => getSupabaseConfig() !== null;

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * The one client instance for the app. Null when the build has no Supabase
 * config.
 *
 * Auth persists. It has to: the guide is offline-first, and `getSession()`
 * reads local storage without a network call, so a person who signed in at the
 * dock is still signed in on a jetty with no bars. `detectSessionInUrl` is on
 * because password-reset and magic-link callbacks arrive as URL fragments —
 * with it off (as it was before accounts existed) those links silently do
 * nothing, which is exactly what the admin console's magic link had been doing.
 *
 * The SDK is imported dynamically and memoised. The guide's entire static
 * content — every location, species, rig and handling note — renders without
 * ever touching Supabase, so making ~100 kB of client SDK part of the initial
 * bundle would tax every visitor for a layer that is strictly additive. The
 * only caller is `readConditions`, which is already async, so this costs
 * nothing at the call site.
 */
export function getSupabaseClient(): Promise<SupabaseClient> | null {
  if (clientPromise) return clientPromise;
  const config = getSupabaseConfig();
  if (!config) return null;
  clientPromise = loadClient(config);
  return clientPromise;
}

async function loadClient(config: SupabaseConfig): Promise<SupabaseClient> {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'shorebound.auth',
    },
    global: { headers: { 'x-application-name': 'shorebound' } },
  });
}

/* ------------------------------------------------------------------ reads */

interface LocationRow {
  slug: string;
  tide_station_id: string | null;
  tide_stations: { id: string; name: string | null; url: string | null } | null;
}

interface SnapshotRow {
  payload: unknown;
  refreshed_at: string | null;
  source_url: string | null;
}

/** PostgREST returns an embedded to-one either as an object or a 1-element array. */
function firstEmbedded<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** The oldest timestamp present, so staleness is never understated. */
function oldest(...values: Array<string | null | undefined>): string | null {
  let best: { iso: string; ms: number } | null = null;
  for (const iso of values) {
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) continue;
    if (!best || ms < best.ms) best = { iso, ms };
  }
  return best?.iso ?? null;
}

const NOAA_STATION_PAGE = (id: string) =>
  `https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=${id}`;

/**
 * Reads the latest cached tide + weather snapshot for a location slug.
 *
 * Rejects only on a genuine transport/query failure, which `useConditions()`
 * turns into the inline error state. Everything else degrades to null inside a
 * valid snapshot:
 *
 *   - a location with no NOAA station (several southern spots legitimately have
 *     none) resolves with `tides: []` and `phase: null`;
 *   - an unknown slug resolves to an empty-but-valid snapshot rather than an
 *     error, because a missing live slot must never take down a page whose real
 *     content is the bundled guide;
 *   - malformed jsonb from either external API parses to null, never a throw
 *     (see the parsers in conditions.ts).
 */
export async function readConditions(slug: string): Promise<ConditionsSnapshot> {
  const clientPromise = getSupabaseClient();
  if (!clientPromise) throw new Error('Supabase is not configured for this build');
  const supabase = await clientPromise;

  const empty = (): ConditionsSnapshot => ({
    location_slug: slug,
    station_id: null,
    station_name: null,
    station_url: null,
    refreshed_at: null,
    tides: [],
    phase: null,
    weather: null,
    sources: [],
  });

  const { data: locationRow, error: locationError } = await supabase
    .from('locations')
    .select('slug, tide_station_id, tide_stations(id, name, url)')
    .eq('slug', slug)
    .maybeSingle();
  if (locationError) throw new Error(locationError.message);
  if (!locationRow) return empty();

  const location = locationRow as unknown as LocationRow;
  const station = firstEmbedded(location.tide_stations);
  const stationId = location.tide_station_id ?? station?.id ?? null;

  // Independent reads — one round trip each, run together.
  const [tideResult, weatherResult] = await Promise.all([
    stationId
      ? supabase
          .from('tide_latest')
          .select('payload, refreshed_at, source_url')
          .eq('station_id', stationId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('weather_latest')
      .select('payload, refreshed_at, source_url')
      .eq('location_slug', slug)
      .eq('kind', 'forecast')
      .maybeSingle(),
  ]);

  if (tideResult.error) throw new Error(tideResult.error.message);
  if (weatherResult.error) throw new Error(weatherResult.error.message);

  const tideRow = (tideResult.data ?? null) as SnapshotRow | null;
  const weatherRow = (weatherResult.data ?? null) as SnapshotRow | null;

  const now = Date.now();
  const tides = tideRow ? parseTidePredictions(tideRow.payload) : [];
  const phase = tideRow ? derivePhase(tideRow.payload, now) : null;
  const weather = weatherRow ? parseNwsForecast(weatherRow.payload, now) : null;

  const sources: ConditionsSnapshot['sources'] = [];
  if (tideRow && stationId) {
    sources.push({
      label: `NOAA CO-OPS tide predictions — station ${stationId}`,
      url: station?.url ?? NOAA_STATION_PAGE(stationId),
    });
  }
  if (weatherRow && weather) {
    sources.push({
      label: 'NWS forecast — api.weather.gov',
      url: weatherRow.source_url ?? 'https://www.weather.gov/documentation/services-web-api',
    });
  }

  return {
    location_slug: slug,
    station_id: stationId,
    station_name: station?.name ?? null,
    station_url: station?.url ?? (stationId ? NOAA_STATION_PAGE(stationId) : null),
    refreshed_at: oldest(tideRow?.refreshed_at, weatherRow?.refreshed_at),
    tides,
    phase,
    weather,
    sources,
  };
}
