import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { FISH, HABITATS, HAZARDS, LOCATIONS } from '../data';
import type { MediaRef } from '../data';

/**
 * Licensing enforcement.
 *
 * Several identification photos are Creative Commons (CC BY 4.0, CC BY-SA 4.0),
 * which legally require visible attribution — not a title attribute, not a
 * comment in the source. This suite fails the build if a licensed image can
 * reach the screen without its credit, so adding a new plate cannot quietly
 * drop an attribution.
 */

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** Every licensed MediaRef, with the route(s) that render it. */
const LICENSED: Array<{ where: string; route: string; media: MediaRef }> = [
  ...HAZARDS.filter((h) => h.image?.license).map((h) => ({
    where: `hazard/${h.id}`,
    route: '/care',
    media: h.image as MediaRef,
  })),
  ...FISH.flatMap((f) =>
    f.images
      .filter((m) => m.license)
      .map((m) => ({ where: `fish/${f.id}`, route: `/fish/${f.id}`, media: m })),
  ),
  ...HABITATS.flatMap((h) =>
    h.photos.filter((m) => m.license).map((m) => ({ where: `habitat/${h.id}`, route: '/water', media: m })),
  ),
  ...LOCATIONS.flatMap((l) =>
    l.images
      .filter((m) => m.license)
      .map((m) => ({ where: `location/${l.slug}`, route: `/locations/${l.slug}`, media: m })),
  ),
];

describe('image licensing', () => {
  it('has licensed media to check', () => {
    // Guards against this suite silently passing because the data lost its
    // provenance fields entirely.
    expect(LICENSED.length).toBeGreaterThan(0);
  });

  it('shows a visible credit wherever a licensed image renders', () => {
    for (const { where, route, media } of LICENSED) {
      const { unmount } = renderAt(route);
      const main = screen.getByRole('main');
      const text = main.textContent ?? '';

      expect(text, `${where}: no visible license credit on ${route}`).toContain(
        media.license as string,
      );

      if (media.source_url) {
        const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href') ?? '');
        expect(hrefs, `${where}: credit on ${route} does not link its source`).toContain(
          media.source_url,
        );
      }
      unmount();
    }
  });

  it('bundles every licensed image, so it survives offline', () => {
    // The identification photographs were remote hotlinks, and jpg/webp were
    // missing from the precache glob — so with no connection every species page
    // and all six Handle With Care cards rendered broken-image icons. On those
    // pages the photograph IS the content, which made this a failure of the
    // app's first hard constraint rather than a cosmetic one.
    //
    // Licensed media is now local. This fails if any of it goes back to a
    // remote URL, which no service worker config could rescue.
    for (const { where, media } of LICENSED) {
      expect(
        media.url.startsWith('/assets/'),
        `${where}: "${media.url}" is remote — it will render as a broken image offline`,
      ).toBe(true);
    }
  });

  it('credits every CC-licensed image by name, as the licence requires', () => {
    // CC BY and CC BY-SA require attribution to the creator; a bare "CC BY-SA
    // 4.0" with no name does not satisfy the licence.
    for (const { where, media } of LICENSED) {
      const license = media.license as string;
      if (!/^CC BY/i.test(license)) continue;
      expect(
        license.replace(/^CC BY(-SA)? [\d.]+/i, '').trim().length,
        `${where}: "${license}" names a CC licence but no creator`,
      ).toBeGreaterThan(3);
    }
  });
});
