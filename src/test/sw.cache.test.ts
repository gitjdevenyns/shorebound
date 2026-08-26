import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * What the service worker is allowed to write to disk.
 *
 * The runtime cache rule used to match the whole Supabase origin
 * (`/^https:\/\/[a-z0-9-]+\.supabase\.co\/.*​/i`), which quietly included
 * `/auth/v1/user` and the `profiles` read carrying email, display name and
 * tier. `signOut()` clears React state and the SDK's localStorage; it does not
 * clear Cache Storage, and has no reason to. So a signed-out user's details
 * stayed readable on a shared device for 24 hours.
 *
 * The rule is now an allowlist of read-only, non-personal endpoints. These
 * tests assert it stays one — a widened pattern is a privacy regression that
 * nothing else in the suite would notice, because the app behaves identically
 * either way.
 */
const RAW = readFileSync(join(__dirname, '..', '..', 'vite.config.ts'), 'utf8');
const SW = join(__dirname, '..', '..', 'dist', 'sw.js');

// Comments only, stripped. The comments around this rule quote the old unsafe
// pattern and name the endpoints it leaked, which is exactly the text these
// assertions look for — reading them would fail the file for explaining itself.
const CONFIG = RAW.split('\n')
  .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*'))
  .join('\n');

/** Anything that identifies a person, or that only an admin should read. */
const MUST_NOT_CACHE = ['auth/v1', 'profiles', 'admins', 'account_audit', 'shop_listings', 'ad_campaigns'];

describe('service worker runtime cache', () => {
  it('does not match the Supabase origin wholesale', () => {
    expect(
      /supabase\\?\.co(\\?\/)?\.\*/i.test(CONFIG),
      'the runtime cache matches the whole Supabase origin again — that puts ' +
        '/auth/v1/user and the profiles read on disk for 24 hours, and sign-out ' +
        'does not clear Cache Storage',
    ).toBe(false);
  });

  it('names an explicit table allowlist', () => {
    expect(CONFIG).toMatch(/rest\\?\/v1\\?\/\(/);
    expect(CONFIG).toContain('tide_latest');
    expect(CONFIG).toContain('weather_latest');
  });

  // The executable pattern only — not the comments around it, which discuss
  // the very endpoints being excluded and would otherwise fail this by talking
  // about them.
  const runtime = CONFIG.slice(CONFIG.indexOf('runtimeCaching'), CONFIG.indexOf('StaleWhileRevalidate'));
  const pattern = runtime
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

  for (const path of MUST_NOT_CACHE) {
    it(`never routes ${path} into a cache`, () => {
      expect(
        pattern.includes(path),
        `${path} appears in the runtime cache pattern — it must never be written to disk`,
      ).toBe(false);
    });
  }

  // Belt and braces: when a build is present, assert the same thing about the
  // worker that actually ships, not just the config that generates it.
  it.runIf(existsSync(SW))('the built worker carries no personal endpoint', () => {
    const sw = readFileSync(SW, 'utf8');
    for (const path of MUST_NOT_CACHE) {
      expect(sw.includes(path), `dist/sw.js routes ${path}`).toBe(false);
    }
  });
});
