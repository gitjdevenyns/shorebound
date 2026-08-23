# refresh-conditions

Scheduled Edge Function that snapshots external conditions data into the cache
tables (`tide_snapshots`, `weather_snapshots`) so the client only ever reads
Supabase (via the `tide_latest` / `weather_latest` views) and never calls
external APIs directly.

## Status: DEPLOYED and SCHEDULED

- Deployed to project `nwpuausjhqtvwmjprphc` (`verify_jwt = true`).
- Scheduled by `supabase/migrations/20260810170000_schedule_refresh_conditions.sql`
  as pg_cron job `refresh-conditions-every-3h`, `5 */3 * * *` (UTC).
- One run covers 9 CO-OPS stations and 15 locations in roughly 18 seconds.

## Data sources and terms (verified 2026-08-09, live since 2026-08-10)

| Source | Endpoint | Terms |
| --- | --- | --- |
| NWS API | `api.weather.gov` | US Government work, public domain. Requires a `User-Agent` header identifying the application and a contact (we send `(shorebound shore fishing guide, support@shorebound.app)`) and we ask for `Accept: application/geo+json`. Docs: https://www.weather.gov/documentation/services-web-api |
| NOAA CO-OPS | `api.tidesandcurrents.noaa.gov` | US Government work, public domain. No API key; callers should identify themselves via the `application=` query parameter (we send `shorebound`). Docs: https://api.tidesandcurrents.noaa.gov/api/prod/ |

Everything cached here is a **prediction** (CO-OPS astronomical tide) or a
**forecast** (NWS). Neither is an observation, and the UI must not present them
as one.

## What the run does

1. Reads `locations` (slug, lat, lng, tide_station_id).
2. For each distinct `tide_station_id`, requests CO-OPS predictions with
   `interval=hilo` — the only product CO-OPS serves for subordinate stations,
   and eight of the nine GCF stations are subordinate.
3. For each location, resolves `/points/{lat},{lng}` to a gridpoint forecast URL
   and fetches it. Both hops are cached in-run (points by rounded coordinate,
   forecast by gridpoint URL), so the 15 locations cost ~12 forecast fetches.
4. Prunes snapshot rows older than 7 days.

Failures are per-item: one bad station or location lands in `errors` and the run
continues, returning HTTP 207.

### Why the window starts yesterday

Predictions are requested with `begin_date = today - 1 day` and `range=96`
rather than starting at midnight today. These are mixed/diurnal stations whose
first event of a calendar day can fall as late as ~10:30 local — for example
8726247 on 2026-08-10 has only `10:35 H` and `19:22 L`. A window starting at
midnight would therefore contain no event *before* "now" for most of the
morning, and the client derives the current tide stage by bracketing now
between two events. Starting a day early guarantees a preceding event exists.

### Timestamps

CO-OPS is queried with `time_zone=lst_ldt`, so `predictions[].t` is a bare
station-local wall-clock string (`"2026-08-10 10:35"`) with no offset. The
function stamps a `shorebound_meta` sidecar into the stored payload recording
`station_tz` (`America/New_York` — every GCF station is in Florida), the datum,
units, interval and `kind: "prediction"`. The client resolves the naive strings
against `shorebound_meta.station_tz`, so a viewer in another timezone still sees the
correct stage.

## Deployment

No local Docker in this environment, so bundle server-side:

```sh
supabase functions deploy refresh-conditions --project-ref nwpuausjhqtvwmjprphc --use-api
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into the runtime
automatically; no extra secrets are needed.

Smoke test (service-role key stays server-side / in your local shell only):

```sh
curl -X POST "https://nwpuausjhqtvwmjprphc.supabase.co/functions/v1/refresh-conditions" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

## Schedule

The migration creates `pg_cron` + `pg_net` and registers the job. It reads the
caller's bearer token from Vault at run time, so no key material is in the
repository. Create that secret once per project:

```sql
-- NOTE: the secret is named `gcf_functions_bearer` from before the rename.
-- The scheduled job looks it up by that exact name, so it stays as-is;
-- renaming it here without renaming it in the vault breaks the 3-hourly refresh.
select vault.create_secret('<VITE_SUPABASE_ANON_KEY>', 'gcf_functions_bearer');
```

The anon key is enough: `verify_jwt = true` keeps the endpoint closed to
anonymous callers, and the function's own database writes use the injected
service-role key. The service-role key is never used as the scheduled caller's
bearer.

Verify:

```sql
select jobid, jobname, schedule, active from cron.job;
select status_code, left(content, 200) from net._http_response order by id desc limit 5;
```

## Retention

Each run prunes snapshot rows older than 7 days, so the cache tables stay tiny
(latest rows are what clients read; a few days of history aids debugging).

## fishing_report_snapshots

The table exists, but no ingestion is wired and none should be added: research
(2026-08-09) found no government or openly licensed machine-readable
fishing-report feed suitable for automated ingestion. The table is reserved for
a future editorial/manual pipeline.
