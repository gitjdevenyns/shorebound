import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { FISH, HAZARDS, LOCATIONS } from '../data';

/**
 * Route coverage.
 *
 * Deliberately structural rather than copy-based: these assert that every route
 * renders real content with a correct document outline and no React warnings.
 * Copy assertions belong in the per-page tests, so a wording change doesn't fail
 * the suite that exists to prove nothing is broken.
 */

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/**
 * Any console.error is a failure. React reports invalid DOM nesting, missing
 * keys, bad props and failed act() this way, and the brief requires a build
 * with no console errors or warnings.
 */
let consoleErrors: string[] = [];
let consoleWarnings: string[] = [];
let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleErrors = [];
  consoleWarnings = [];
  errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args.map(String).join(' '));
  });
  warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    consoleWarnings.push(args.map(String).join(' '));
  });
});

afterEach(() => {
  errorSpy.mockRestore();
  warnSpy.mockRestore();
});

function expectCleanConsole(where: string) {
  expect(consoleErrors, `${where} logged console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  expect(
    consoleWarnings,
    `${where} logged console warnings:\n${consoleWarnings.join('\n')}`,
  ).toEqual([]);
}

/** Every route reachable from the shell, plus the catch-all. */
const STATIC_ROUTES = [
  '/',
  '/locations',
  '/fish',
  '/id',
  '/water',
  '/tides',
  '/rigs',
  '/care',
  '/shops',
  '/privacy',
  '/support',
  '/welcome',
  '/nope/nothing-here',
];

/**
 * The list above is hand-written, and three pages were once added to the
 * router without it — which quietly excluded them from the render, axe and
 * heading checks below. This asserts the two cannot drift apart again.
 */
describe('the route list matches the router', () => {
  it('covers every path declared in App.tsx', () => {
    const app = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf8');
    const declared = [...app.matchAll(/<Route path="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((p) => p !== '*' && !p.includes(':'));
    const missing = declared.filter((p) => !STATIC_ROUTES.includes(p));
    expect(missing, `Routed but untested:\n${missing.join('\n')}`).toEqual([]);
  });
});

describe('every route renders', () => {
  for (const path of STATIC_ROUTES) {
    it(`renders ${path} with a single h1 and no console noise`, () => {
      renderAt(path);
      const h1s = screen.getAllByRole('heading', { level: 1 });
      expect(h1s.length, `${path} should have exactly one h1`).toBe(1);
      expect(h1s[0].textContent?.trim()).toBeTruthy();
      expectCleanConsole(path);
    });
  }

  it('never renders the error boundary fallback on a healthy route', () => {
    for (const path of STATIC_ROUTES) {
      const { unmount } = renderAt(path);
      expect(screen.queryByText(/this screen failed to load/i), path).toBeNull();
      unmount();
    }
  });
});

describe('every location page', () => {
  it.each(LOCATIONS.map((l) => [l.slug, l.name] as const))(
    'renders /locations/%s',
    (slug, name) => {
      renderAt(`/locations/${slug}`);
      // The location's own name is the page heading.
      expect(
        screen.getByRole('heading', { level: 1 }).textContent,
        `${slug} heading`,
      ).toContain(name.split(' / ')[0]);
      expect(screen.queryByText(/page not found/i), slug).toBeNull();
      expectCleanConsole(`/locations/${slug}`);
    },
  );

  it('shows every location its four tide stages and its target species', () => {
    for (const loc of LOCATIONS) {
      const { unmount } = renderAt(`/locations/${loc.slug}`);
      const main = screen.getByRole('main');
      for (const stage of ['low', 'incoming', 'high', 'outgoing']) {
        expect(
          within(main).getAllByText(new RegExp(`\\b${stage}\\b`, 'i')).length,
          `${loc.slug} is missing the ${stage} stage`,
        ).toBeGreaterThan(0);
      }
      for (const target of loc.targets) {
        expect(
          within(main).getAllByText(new RegExp(target.species_label, 'i')).length,
          `${loc.slug} is missing target ${target.species_label}`,
        ).toBeGreaterThan(0);
      }
      unmount();
    }
  });

  it('links every location to its verified NOAA tide station', () => {
    for (const loc of LOCATIONS) {
      const { unmount } = renderAt(`/locations/${loc.slug}`);
      const id = loc.tide_station.noaa_id as string;
      const links = screen
        .getAllByRole('link')
        .map((a) => a.getAttribute('href') ?? '')
        .filter((href) => href.includes(id));
      expect(links.length, `${loc.slug} does not link station ${id}`).toBeGreaterThan(0);
      unmount();
    }
  });

  it('renders an unknown slug as not found rather than crashing', () => {
    renderAt('/locations/not-a-real-place');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/not found/i);
  });
});

describe('every species page', () => {
  it.each(FISH.map((f) => [f.id, f.name] as const))('renders /fish/%s', (id, name) => {
    renderAt(`/fish/${id}`);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(name);
    expectCleanConsole(`/fish/${id}`);
  });

  it('shows release handling and the angler hazard note for every species', () => {
    for (const fish of FISH) {
      const { unmount } = renderAt(`/fish/${fish.id}`);
      const main = screen.getByRole('main');
      // Conservation by default: DOs, DON'Ts and the angler-safety note are
      // required on every target species page (PRODUCT_SPEC.md principle 4).
      for (const line of [...fish.handling.dos, ...fish.handling.donts]) {
        expect(
          within(main).getAllByText(new RegExp(escapeRe(line.slice(0, 24)), 'i')).length,
          `${fish.id} is missing handling line: ${line}`,
        ).toBeGreaterThan(0);
      }
      expect(
        within(main).getAllByText(new RegExp(escapeRe(fish.handling.angler.slice(0, 24)), 'i'))
          .length,
        `${fish.id} is missing its angler hazard note`,
      ).toBeGreaterThan(0);
      unmount();
    }
  });

  it('renders an unknown species id as not found rather than crashing', () => {
    renderAt('/fish/not-a-real-fish');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/not found/i);
  });
});

describe('handle with care', () => {
  it('shows all six hazard species with risk and handling guidance', () => {
    renderAt('/care');
    const main = screen.getByRole('main');
    for (const hazard of HAZARDS) {
      expect(
        within(main).getAllByText(new RegExp(escapeRe(hazard.name), 'i')).length,
        `missing hazard ${hazard.id}`,
      ).toBeGreaterThan(0);
      expect(
        within(main).getAllByText(new RegExp(escapeRe(hazard.handle.slice(0, 24)), 'i')).length,
        `missing handling guidance for ${hazard.id}`,
      ).toBeGreaterThan(0);
    }
    expectCleanConsole('/care');
  });

  it('does not auto-display graphic injury imagery', () => {
    renderAt('/care');
    const injuryUrls = HAZARDS.flatMap((h) => h.injury_media.map((m) => m.url));
    const rendered = screen.queryAllByRole('img').map((i) => i.getAttribute('src') ?? '');
    for (const url of injuryUrls) {
      expect(rendered, 'injury imagery must sit behind an explicit disclosure').not.toContain(url);
    }
  });
});

describe('accessibility basics', () => {
  it('exposes the shell landmarks and a skip link on every route', () => {
    for (const path of STATIC_ROUTES) {
      const { unmount } = renderAt(path);
      expect(screen.getByRole('main'), path).toBeInTheDocument();
      expect(screen.getByRole('banner'), path).toBeInTheDocument();
      expect(screen.getAllByRole('navigation').length, path).toBeGreaterThan(0);
      expect(
        screen.getByRole('link', { name: /skip to content/i }),
        `${path} has no skip link`,
      ).toBeInTheDocument();
      unmount();
    }
  });

  it('gives every image an accessible name', () => {
    const paths = [
      ...STATIC_ROUTES,
      ...LOCATIONS.map((l) => `/locations/${l.slug}`),
      ...FISH.map((f) => `/fish/${f.id}`),
    ];
    for (const path of paths) {
      const { unmount } = renderAt(path);
      // Two kinds of thing carry role=img here: real <img> elements, which name
      // themselves with alt, and the inline diagram <svg role="img">, which name
      // themselves with aria-label. Decorative images opt out (alt="" /
      // aria-hidden) and drop out of the a11y tree, so anything still matching
      // this role is meaningful and must be named.
      for (const el of screen.queryAllByRole('img')) {
        const name =
          el.tagName.toLowerCase() === 'img'
            ? el.getAttribute('alt')
            : (el.getAttribute('aria-label') ?? el.getAttribute('aria-labelledby'));
        expect(
          name?.trim(),
          `${path}: <${el.tagName.toLowerCase()}> exposes role=img with no accessible name`,
        ).toBeTruthy();
      }
      unmount();
    }
  });

  it('gives every link and button an accessible name', () => {
    for (const path of STATIC_ROUTES) {
      const { unmount } = renderAt(path);
      for (const el of [...screen.queryAllByRole('link'), ...screen.queryAllByRole('button')]) {
        expect(
          (el.textContent ?? '').trim() ||
            el.getAttribute('aria-label') ||
            el.getAttribute('title'),
          `${path}: <${el.tagName.toLowerCase()}> has no accessible name`,
        ).toBeTruthy();
      }
      unmount();
    }
  });

  it('opens every external link safely', () => {
    const paths = [...STATIC_ROUTES, ...LOCATIONS.map((l) => `/locations/${l.slug}`)];
    for (const path of paths) {
      const { unmount } = renderAt(path);
      for (const a of screen.queryAllByRole('link')) {
        const href = a.getAttribute('href') ?? '';
        if (!href.startsWith('http')) continue;
        if (a.getAttribute('target') === '_blank') {
          expect(
            a.getAttribute('rel') ?? '',
            `${path}: ${href} opens in a new tab without rel=noreferrer`,
          ).toMatch(/noreferrer|noopener/);
        }
      }
      unmount();
    }
  });
});

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
