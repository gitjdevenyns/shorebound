import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import type { FishIdResult, IdentifyOutcome } from '../lib/identify';
import type { PreparedImage } from '../lib/image';

/**
 * Photo ID — screen behaviour.
 *
 * Two things this suite is really protecting:
 *
 *   1. Every outcome renders something. The page has ten distinct states
 *      (unconfigured, preparing, sending, identified, not identified, and six
 *      named failures) and the production bar for this app is that none of them
 *      is a blank panel, a stuck spinner, or an unhandled rejection.
 *
 *   2. The result never reads as a determination. The standing "estimate, not
 *      an identification" framing has to survive a refactor, because the whole
 *      safety argument for shipping a machine's guess about a venomous fish
 *      rests on it.
 *
 * The network call and the canvas work are mocked; both are exercised for real
 * against the deployed function, and neither exists in jsdom.
 */

vi.mock('../lib/image', async () => {
  const actual = await vi.importActual<typeof import('../lib/image')>('../lib/image');
  return { ...actual, prepareImage: vi.fn() };
});
vi.mock('../lib/identify', async () => {
  const actual = await vi.importActual<typeof import('../lib/identify')>('../lib/identify');
  return { ...actual, identifyFish: vi.fn(), isIdentifyConfigured: vi.fn(() => true) };
});

const { prepareImage } = await import('../lib/image');
const { identifyFish, isIdentifyConfigured } = await import('../lib/identify');

const PREPARED: PreparedImage = {
  base64: 'AAAA',
  mediaType: 'image/jpeg',
  previewUrl: 'blob:preview-1',
  bytes: 184_320,
  width: 1024,
  height: 768,
};

const RESULT: FishIdResult = {
  identified: true,
  common_name: 'Common Snook',
  scientific_name: 'Centropomus undecimalis',
  confidence: 'high',
  field_marks: 'Black lateral line running onto the tail, and a jutting lower jaw.',
  guide_species_id: 'snook',
  is_potentially_hazardous: true,
  hazard_note: 'Razor-sharp gill covers — control the head and keep fingers clear.',
  also_consider: ['Fat snook'],
};

const IDENTIFIED: IdentifyOutcome = { ok: true, result: RESULT };

beforeAll(() => {
  // jsdom implements neither, and the page owns the lifetime of its preview blob.
  Object.defineProperty(URL, 'createObjectURL', { value: vi.fn(() => 'blob:preview-1'), writable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), writable: true });
});

beforeEach(() => {
  vi.mocked(isIdentifyConfigured).mockReturnValue(true);
  vi.mocked(prepareImage).mockResolvedValue(PREPARED);
  vi.mocked(identifyFish).mockResolvedValue(IDENTIFIED);
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/id']}>
      <App />
    </MemoryRouter>,
  );
}

/** Drop a file onto one of the page's two hidden file inputs. */
function pickPhoto(container: HTMLElement, which: 'camera' | 'library' = 'camera') {
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
  expect(inputs.length, 'expected a camera input and a library input').toBe(2);
  const input = which === 'camera' ? inputs[0] : inputs[1];
  const file = new File(['x'], 'catch.jpg', { type: 'image/jpeg' });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

/* ------------------------------------------------------------------- entry */

describe('the capture control', () => {
  it('offers a camera capture and a library pick', () => {
    const { container } = renderPage();
    expect(screen.getByRole('button', { name: /take a photo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose a photo/i })).toBeInTheDocument();

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(inputs).toHaveLength(2);
    // `capture` is what makes a phone open the camera instead of the gallery.
    expect(inputs[0].getAttribute('capture')).toBe('environment');
    expect(inputs[0].getAttribute('accept')).toBe('image/*');
    expect(inputs[1].hasAttribute('capture')).toBe(false);
  });

  it('says up front that this is an estimate, before anything is uploaded', () => {
    renderPage();
    const main = screen.getByRole('main');
    expect(main.textContent).toMatch(/estimate, not an identification/i);
    expect(main.textContent).toMatch(/starting point for you to confirm|can be wrong/i);
  });

  it('shows a framing outline to line the fish up against, until there is a real photo', async () => {
    const { container } = renderPage();
    const guide = container.querySelector('.plate--guide');
    expect(guide, 'no framing guide before a photo is taken').toBeTruthy();
    // An outline, not a filled silhouette, and decorative to assistive tech —
    // the same instruction is in the visible text beside it.
    const svg = guide!.querySelector('svg')!;
    expect(svg.getAttribute('fill')).toBe('none');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText(/line the fish up like this/i)).toBeInTheDocument();
    expect(screen.getByText(/whole fish, side-on, filling the frame/i)).toBeInTheDocument();

    pickPhoto(container);
    await screen.findByText('Common Snook');
    expect(container.querySelector('.plate--guide')).toBeNull();
    expect(screen.getByAltText('The photo you are identifying')).toBeInTheDocument();
  });

  it('promises not to keep the photo', () => {
    renderPage();
    expect(screen.getByRole('main').textContent).toMatch(/not stored anywhere/i);
  });

  it('explains itself instead of offering a dead button when unconfigured', () => {
    vi.mocked(isIdentifyConfigured).mockReturnValue(false);
    renderPage();
    expect(screen.getByText(/unavailable right now/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /take a photo/i })).toBeNull();
    // The page still routes the reader somewhere useful.
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/fish');
    expect(hrefs).toContain('/care');
  });
});

/* ------------------------------------------------------------------ result */

describe('a confident identification', () => {
  it('names the species, its marks and its confidence', async () => {
    const { container } = renderPage();
    pickPhoto(container);

    expect(await screen.findByText('Common Snook')).toBeInTheDocument();
    expect(screen.getByText('Centropomus undecimalis')).toBeInTheDocument();
    expect(screen.getByText(/black lateral line/i)).toBeInTheDocument();
    expect(screen.getByText('Confident')).toBeInTheDocument();
    expect(screen.getByText('Best guess')).toBeInTheDocument();
  });

  it('sends the prepared photo, not the original file', async () => {
    const { container } = renderPage();
    pickPhoto(container);
    await screen.findByText('Common Snook');

    expect(vi.mocked(prepareImage)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(identifyFish)).toHaveBeenCalledWith({
      base64: PREPARED.base64,
      mediaType: 'image/jpeg',
    });
  });

  it('deep-links to the guide’s own page for the species', async () => {
    const { container } = renderPage();
    pickPhoto(container);
    await screen.findByText('Common Snook');

    const link = screen.getByRole('link', { name: /Common Snook — identification, tackle/i });
    expect(link).toHaveAttribute('href', '/fish/snook');
  });

  it('links Handle With Care, not a species page, for a hazard species', async () => {
    vi.mocked(identifyFish).mockResolvedValue({
      ok: true,
      result: {
        ...RESULT,
        common_name: 'Hardhead / Gafftopsail Catfish',
        scientific_name: 'Ariopsis felis',
        guide_species_id: 'catfish',
        hazard_note: 'Venom-associated dorsal and pectoral spines.',
        also_consider: [],
      },
    });
    const { container } = renderPage();
    pickPhoto(container);

    const link = await screen.findByRole('link', { name: /how to handle it/i });
    expect(link).toHaveAttribute('href', '/care');
  });

  it('is honest when it knows the fish but has no page for it', async () => {
    // Kingfish is named as a target at one spot and documented at none. The
    // result must say that, not dress a location link up as a species page.
    vi.mocked(identifyFish).mockResolvedValue({
      ok: true,
      result: {
        ...RESULT,
        common_name: 'Kingfish',
        scientific_name: 'Scomberomorus cavalla',
        guide_species_id: 'kingfish',
        is_potentially_hazardous: false,
        hazard_note: '',
        also_consider: [],
      },
    });
    const { container } = renderPage();
    pickPhoto(container);
    await screen.findByText('Kingfish');

    expect(screen.getByText(/no species page for kingfish yet/i)).toBeInTheDocument();
    expect(screen.getByText(/named as a target at 1 spot/i)).toBeInTheDocument();
    expect(screen.getByText('Named in this guide')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /a spot that fishes for kingfish/i });
    expect(link.getAttribute('href')).toMatch(/^\/locations\//);
  });

  it('carries the hazard warning and the look-alikes with the result', async () => {
    const { container } = renderPage();
    pickPhoto(container);
    await screen.findByText('Common Snook');

    expect(screen.getByText(/razor-sharp gill covers/i)).toBeInTheDocument();
    expect(screen.getByText(/could also be: fat snook/i)).toBeInTheDocument();
  });

  it('still reads as a guess next to a confident answer', async () => {
    const { container } = renderPage();
    pickPhoto(container);
    await screen.findByText('Common Snook');

    const main = screen.getByRole('main');
    expect(main.textContent).toMatch(/machine.s reading of one photograph/i);
    expect(main.textContent).toMatch(/confirm it against the marks yourself/i);
    // Nothing on the page may imply a calibrated probability.
    expect(main.textContent).not.toMatch(/\d+\s?% (sure|confident|match)/i);
  });

  it('shows the photo back with its sent size', async () => {
    const { container } = renderPage();
    pickPhoto(container);
    await screen.findByText('Common Snook');

    const preview = screen.getByAltText('The photo you are identifying');
    expect(preview).toHaveAttribute('src', 'blob:preview-1');
    expect(screen.getByText(/1024×768 · 180 kB/)).toBeInTheDocument();
  });

  it('does not omit anything while it is working', async () => {
    let release: (value: IdentifyOutcome) => void = () => {};
    vi.mocked(identifyFish).mockReturnValue(
      new Promise<IdentifyOutcome>((resolve) => {
        release = resolve;
      }),
    );
    const { container } = renderPage();
    pickPhoto(container);

    expect(await screen.findByText(/reading the photo/i)).toBeInTheDocument();
    release(IDENTIFIED);
    expect(await screen.findByText('Common Snook')).toBeInTheDocument();
    expect(screen.queryByText(/reading the photo/i)).toBeNull();
  });
});

describe('an honest failure to identify', () => {
  const UNSURE: IdentifyOutcome = {
    ok: true,
    result: {
      identified: false,
      common_name: '',
      scientific_name: '',
      confidence: 'low',
      field_marks: 'Only the tail is in frame; a side-on photo of the whole fish would settle it.',
      guide_species_id: 'none',
      is_potentially_hazardous: true,
      hazard_note: '',
      also_consider: ['Ladyfish', 'Jack crevalle'],
    },
  };

  it('says it could not tell, and says what would help', async () => {
    vi.mocked(identifyFish).mockResolvedValue(UNSURE);
    const { container } = renderPage();
    pickPhoto(container);

    expect(await screen.findByText(/couldn.t confidently identify this/i)).toBeInTheDocument();
    expect(screen.getByText(/only the tail is in frame/i)).toBeInTheDocument();
    expect(screen.getByText(/ladyfish, jack crevalle/i)).toBeInTheDocument();
  });

  it('never invents a species page link for an unidentified fish', async () => {
    vi.mocked(identifyFish).mockResolvedValue(UNSURE);
    const { container } = renderPage();
    pickPhoto(container);
    await screen.findByText(/couldn.t confidently identify this/i);

    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.filter((h) => h.startsWith('/fish/'))).toEqual([]);
  });

  it('tells the reader to handle an unknown fish as a dangerous one', async () => {
    vi.mocked(identifyFish).mockResolvedValue(UNSURE);
    const { container } = renderPage();
    pickPhoto(container);
    await screen.findByText(/couldn.t confidently identify this/i);

    expect(screen.getByText(/treat it as if it bites/i)).toBeInTheDocument();
  });
});

/* ---------------------------------------------------------------- failures */

describe('every failure lands somewhere readable', () => {
  const CASES: Array<{ outcome: IdentifyOutcome; heading: RegExp; retry: boolean }> = [
    {
      outcome: { ok: false, kind: 'offline', message: 'No connection reached the service.' },
      heading: /no connection/i,
      retry: true,
    },
    {
      outcome: { ok: false, kind: 'timeout', message: 'That took too long and was cancelled.' },
      heading: /took too long/i,
      retry: true,
    },
    {
      outcome: { ok: false, kind: 'server', message: 'The service did not answer.' },
      heading: /did not answer/i,
      retry: true,
    },
    {
      outcome: {
        ok: false,
        kind: 'rate-limited',
        message: 'You have used your 6 photo identifications for the hour.',
        retryAfterSeconds: 1800,
      },
      heading: /that is enough for now/i,
      retry: false,
    },
    {
      outcome: { ok: false, kind: 'too-large', message: 'That photo was too large to send.' },
      heading: /too large/i,
      retry: false,
    },
    {
      outcome: { ok: false, kind: 'declined', message: 'The service declined to answer.' },
      heading: /no answer for this photo/i,
      retry: false,
    },
  ];

  for (const { outcome, heading, retry } of CASES) {
    it(`renders the ${(outcome as { kind: string }).kind} state${retry ? ' with a retry' : ' without a pointless retry'}`, async () => {
      vi.mocked(identifyFish).mockResolvedValue(outcome);
      const { container } = renderPage();
      pickPhoto(container);

      // By role, not by text: several of these titles legitimately share
      // wording with the sentence underneath them.
      const state = (await screen.findByRole('heading', { name: heading })).closest(
        '.state',
      ) as HTMLElement;
      expect(state).toBeTruthy();
      expect(within(state).getByText((outcome as { message: string }).message)).toBeInTheDocument();
      const retryButton = within(state).queryByRole('button', { name: /try again/i });
      expect(Boolean(retryButton)).toBe(retry);
    });
  }

  it('explains why the rate limit exists rather than just refusing', async () => {
    vi.mocked(identifyFish).mockResolvedValue({
      ok: false,
      kind: 'rate-limited',
      message: 'You have used your 6 photo identifications for the hour.',
    });
    const { container } = renderPage();
    pickPhoto(container);
    await screen.findByText(/that is enough for now/i);

    expect(screen.getByText(/real, paid call to an AI service/i)).toBeInTheDocument();
  });

  it('retries with the same prepared photo, without re-encoding it', async () => {
    vi.mocked(identifyFish).mockResolvedValue({
      ok: false,
      kind: 'server',
      message: 'The service did not answer.',
    });
    const { container } = renderPage();
    pickPhoto(container);
    await screen.findByRole('heading', { name: /did not answer/i });

    vi.mocked(identifyFish).mockResolvedValue(IDENTIFIED);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Common Snook')).toBeInTheDocument();
    expect(vi.mocked(prepareImage)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(identifyFish)).toHaveBeenCalledTimes(2);
  });

  it('reports an unreadable file locally, without spending a request on it', async () => {
    const { ImageError } = await vi.importActual<typeof import('../lib/image')>('../lib/image');
    vi.mocked(prepareImage).mockRejectedValue(
      new ImageError('That photo could not be opened on this device.', 'unreadable'),
    );
    const { container } = renderPage();
    pickPhoto(container);

    expect(await screen.findByText(/could not read that photo/i)).toBeInTheDocument();
    expect(screen.getByText(/could not be opened on this device/i)).toBeInTheDocument();
    expect(vi.mocked(identifyFish)).not.toHaveBeenCalled();
  });

  it('recovers from a rejected file — the next pick still works', async () => {
    const { ImageError } = await vi.importActual<typeof import('../lib/image')>('../lib/image');
    vi.mocked(prepareImage).mockRejectedValueOnce(
      new ImageError('That file is not an image.', 'unsupported'),
    );
    const { container } = renderPage();
    pickPhoto(container);
    await screen.findByText(/could not read that photo/i);

    pickPhoto(container, 'library');
    expect(await screen.findByText('Common Snook')).toBeInTheDocument();
    expect(screen.queryByText(/could not read that photo/i)).toBeNull();
  });
});

/* ------------------------------------------------------------------ access */

describe('entry points', () => {
  it('is reachable from Home', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /identify a fish from a photo/i });
    expect(link).toHaveAttribute('href', '/id');
  });

  it('is reachable from the species index', () => {
    render(
      <MemoryRouter initialEntries={['/fish']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /identify one from a photo/i })).toHaveAttribute(
      'href',
      '/id',
    );
  });

  it('stays out of the five-slot tab bar', () => {
    renderPage();
    const tabs = screen.getByRole('navigation', { name: /primary/i });
    expect(within(tabs).getAllByRole('link')).toHaveLength(5);
    expect(within(tabs).queryByRole('link', { name: /photo id/i })).toBeNull();
  });
});
