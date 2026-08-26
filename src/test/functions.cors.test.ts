import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every Edge Function the browser calls has to name, in its preflight
 * response, the headers supabase-js actually attaches to an invoke.
 *
 * When it does not, the browser rejects the preflight and the request is never
 * sent — and the error the client reports is "Failed to send a request to the
 * Edge Function", which points squarely at the function. The function is fine.
 * It was never reached. That misdirection cost real time on `admin-users` and
 * `delete-account`, both of which were written with a shorter header list than
 * `identify-fish`, which had it right all along.
 *
 * The client sends `apikey` and `x-client-info` on every call, and newer
 * versions add `x-supabase-api-version`.
 */
const FUNCTIONS_DIR = join(__dirname, '..', '..', 'supabase', 'functions');

const REQUIRED = ['authorization', 'x-client-info', 'apikey', 'content-type'];

/**
 * The origin the app is actually served from. A function that allowlists
 * origins has to name this one, or the browser blocks the preflight and the
 * feature is dead on the live site while every test still passes — which is
 * exactly what happened to photo ID when hosting moved off GitHub Pages. The
 * header list above was guarded because it broke once; the origin list was
 * not, because it hadn't yet.
 */
const PRODUCTION_ORIGIN = 'https://shorebound.fish';

const functions = existsSync(FUNCTIONS_DIR)
  ? readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => existsSync(join(FUNCTIONS_DIR, name, 'index.ts')))
  : [];

describe('Edge Function CORS', () => {
  it('finds the functions to check', () => {
    expect(functions.length, 'no Edge Functions found — did the path move?').toBeGreaterThan(0);
  });

  for (const name of functions) {
    const source = readFileSync(join(FUNCTIONS_DIR, name, 'index.ts'), 'utf8');

    // A function with no OPTIONS branch is not browser-callable (refresh-conditions
    // runs on a schedule), and has nothing to get wrong here.
    const browserCallable = /OPTIONS/.test(source);
    if (!browserCallable) continue;

    it(`${name} accepts every header supabase-js sends`, () => {
      const declared = source
        .match(/Access-Control-Allow-Headers"?'?\s*:\s*\n?\s*['"]([^'"]+)['"]/i)?.[1]
        .toLowerCase() ?? '';
      expect(declared, `${name} declares no Access-Control-Allow-Headers`).not.toBe('');
      for (const header of REQUIRED) {
        expect(
          declared.includes(header),
          `${name} omits "${header}" — the browser will reject the preflight and the ` +
            `client will blame the function for a request it never sent`,
        ).toBe(true);
      }
    });

    // Not every function allowlists origins. The ones that do must include the
    // origin the app is served from.
    const originList = source.match(/ALLOWED_ORIGINS\s*=\s*\[([\s\S]*?)\]/)?.[1];
    if (originList) {
      it(`${name} allows the production origin`, () => {
        expect(
          originList.includes(PRODUCTION_ORIGIN),
          `${name} allowlists origins but omits ${PRODUCTION_ORIGIN} — the browser ` +
            `will block the preflight and the feature is dead on the live site`,
        ).toBe(true);
      });
    }
  }
});
