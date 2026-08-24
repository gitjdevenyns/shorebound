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
