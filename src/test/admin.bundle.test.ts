import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The owner console must not reach readers.
 *
 * It is a separate Vite entry precisely so that a person installing the guide
 * does not download admin code, Supabase auth, or a queue of half-finished
 * editorial judgement about real businesses. That separation is easy to undo
 * by accident — one import from a shared component pulls the whole tree back
 * into the app chunk — so it is asserted here rather than assumed.
 */

const SRC = join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'admin' || e.name === 'test') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/**
 * The owner-only actions on the admin-users Edge Function — approving an
 * account, changing somebody's address, deleting them, sending a reset — are
 * enforced server-side, so a reader who found the endpoint still could not use
 * it. But they should also not be DISCOVERABLE from the reader's bundle:
 * shipping the vocabulary of the owner's tools to every visitor tells them
 * exactly what to go and try.
 *
 * The one function the app legitimately calls for the signed-in user is
 * delete-account, which acts only on the caller's own token.
 */
const OWNER_ONLY = ['admin-users', 'confirm_user', 'set_email', 'delete_user', 'admin_set_tier',
  'admin_list_users', 'admin_signup_stats', 'admin_set_display_name'];

describe('owner-only actions are not named in the reader app', () => {
  it('keeps the owner vocabulary out of files the app entry can reach', () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      const text = readFileSync(f, 'utf8');
      for (const token of OWNER_ONLY) {
        if (text.includes(token)) offenders.push(`${f.split('/src/')[1]} names "${token}"`);
      }
    }
    expect(
      offenders,
      `Owner-only actions must live only in src/admin:\n${offenders.join('\n')}`,
    ).toEqual([]);
  });
});

describe('owner console stays out of the reader app', () => {
  it('is imported by nothing the app entry can reach', () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
        if (/from\s+['"].*\/admin\//.test(line) || /from\s+['"]\.\.?\/admin/.test(line)) {
          offenders.push(`${f.split('/src/')[1]}:${i + 1}  ${line.trim()}`);
        }
      });
    }
    expect(offenders, `The app must not import from src/admin:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('has no /admin route in the app router', () => {
    const app = readFileSync(join(SRC, 'App.tsx'), 'utf8');
    expect(app).not.toContain('/admin');
  });

  it('is excluded from the service worker precache', () => {
    const cfg = readFileSync(join(SRC, '..', 'vite.config.ts'), 'utf8');
    expect(cfg).toContain("'admin.html'");
    expect(cfg).toContain("'assets/admin-*.js'");
  });

  it('is built as its own entry', () => {
    const cfg = readFileSync(join(SRC, '..', 'vite.config.ts'), 'utf8');
    // Either dirname spelling is fine; what matters is that admin.html is a
    // build input of its own rather than a route inside the reader's app.
    expect(cfg).toMatch(/admin:\s*resolve\((?:__dirname|import\.meta\.dirname),\s*'admin\.html'\)/);
  });
});

/**
 * The owner console is a separate HTML entry, deliberately kept out of the
 * precache — which means the SPA navigate fallback must be told to leave its
 * path alone.
 *
 * Without the denylist the fallback answered /admin with the reader's app
 * shell out of the cache, React Router matched no route, and the console
 * rendered as the 404 page. It failed only on devices that had already loaded
 * the site once, so curl and a fresh incognito window both reported it fine.
 * That asymmetry is what made a caching bug look like a broken deploy, and it
 * is exactly the kind of thing worth a test rather than a memory.
 */
describe('the owner console is reachable past the service worker', () => {
  const config = readFileSync(join(__dirname, '..', '..', 'vite.config.ts'), 'utf8');

  it('excludes /admin from the SPA navigate fallback', () => {
    const match = config.match(/navigateFallbackDenylist:\s*\[([^\]]*)\]/);
    expect(match, 'navigateFallbackDenylist is gone from vite.config.ts').toBeTruthy();
    const patterns = (match?.[1] ?? '')
      .split(/,(?![^/]*\/)/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const body = s.match(/^\/(.*)\/([a-z]*)$/);
        return body ? new RegExp(body[1], body[2]) : null;
      })
      .filter((r): r is RegExp => r !== null);

    expect(patterns.length, 'no usable pattern in the denylist').toBeGreaterThan(0);
    for (const path of ['/admin', '/admin.html', '/admin/']) {
      expect(
        patterns.some((r) => r.test(path)),
        `${path} would be swallowed by the SPA fallback and render as 404`,
      ).toBe(true);
    }
  });

  it('still lets ordinary app routes use the fallback, or offline breaks', () => {
    const match = config.match(/navigateFallbackDenylist:\s*\[([^\]]*)\]/);
    const body = (match?.[1] ?? '').trim().match(/^\/(.*)\/([a-z]*)$/);
    const re = body ? new RegExp(body[1], body[2]) : null;
    expect(re).toBeTruthy();
    for (const path of ['/', '/locations', '/fish/snook', '/settings', '/signin']) {
      expect(re?.test(path), `${path} must still be served offline from the precache`).toBe(false);
    }
  });
});
