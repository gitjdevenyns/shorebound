import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Link previews, guarded as source invariants.
 *
 * Before these tags existed the site had no og:image at all, so a phone fell
 * back to guessing: iMessage picked up the 192px apple-touch-icon and rendered
 * the app icon, cropped, as the entire preview. Nothing was broken and nothing
 * reported an error — the preview was simply poor, everywhere the link was
 * shared, and only a human looking at a text message would ever notice.
 *
 * That is the class of defect these assert against: silent, cosmetic to a
 * build, and visible to every recipient.
 */
const ROOT = join(__dirname, '..', '..');
const HTML = readFileSync(join(ROOT, 'index.html'), 'utf8');

/** The one place the deployed origin is written down for previews. */
const ORIGIN = 'https://shorebound.fish';

function meta(attr: 'property' | 'name', key: string): string | null {
  const re = new RegExp(
    `<meta[^>]*${attr}=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`,
    'i',
  );
  const tag = HTML.match(re)?.[0];
  if (!tag) return null;
  // Capture the opening quote and require the SAME character to close it.
  // These values contain apostrophes — "Yo'Self", "Florida's" — so a
  // `["']…["']` pair truncates at the first one and silently returns half
  // the string, which is how this helper first read a 43-character
  // description as complete.
  return tag.match(/content=(["'])([\s\S]*?)\1/i)?.[2] ?? null;
}

describe('link preview metadata', () => {
  it('declares an image for Open Graph and Twitter', () => {
    expect(meta('property', 'og:image'), 'no og:image — phones fall back to the app icon').toBeTruthy();
    expect(meta('name', 'twitter:image')).toBeTruthy();
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
  });

  it('uses absolute image urls', () => {
    // A relative og:image resolves against the *sharing* app, not this site,
    // and silently produces no preview image at all.
    for (const url of [meta('property', 'og:image'), meta('name', 'twitter:image')]) {
      expect(url, 'preview image url is missing').toBeTruthy();
      expect(
        url!.startsWith('https://'),
        `"${url}" is not absolute — a relative og:image yields no preview`,
      ).toBe(true);
    }
  });

  it('points at the deployed origin, not a superseded one', () => {
    // Hosting moved from GitHub Pages to Cloudflare once already, and the
    // stale host survived in six places. A preview url is easy to miss.
    for (const [k, url] of [
      ['og:image', meta('property', 'og:image')],
      ['og:url', meta('property', 'og:url')],
      ['twitter:image', meta('name', 'twitter:image')],
    ] as const) {
      expect(url!.startsWith(ORIGIN), `${k} = "${url}" does not point at ${ORIGIN}`).toBe(true);
    }
    expect(/gitjdevenyns\.github\.io/.test(HTML), 'a superseded host is back in index.html').toBe(false);
  });

  it('ships the image the tags promise, at the size they declare', () => {
    const png = join(ROOT, 'public', 'og-image.png');
    expect(existsSync(png), 'public/og-image.png is missing — the tags point at a 404').toBe(true);

    // PNG header: width and height are big-endian uint32 at bytes 16 and 20.
    const buf = readFileSync(png);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    expect({ width, height }).toEqual({ width: 1200, height: 630 });
    expect(meta('property', 'og:image:width')).toBe(String(width));
    expect(meta('property', 'og:image:height')).toBe(String(height));
  });

  it('carries alt text and a description', () => {
    expect(meta('property', 'og:image:alt')).toBeTruthy();
    expect((meta('property', 'og:description') ?? '').length).toBeGreaterThan(60);
  });
});
