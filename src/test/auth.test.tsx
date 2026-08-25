import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AUTH_STORAGE_KEY } from '../lib/supabase';

/**
 * The gate, from the signed-out side.
 *
 * The rest of the suite runs with a session seeded in setup.ts, because that is
 * the app's normal state. This file clears it and asserts the other half: that
 * the guide is genuinely behind the account, and that the handful of pages a
 * stranger must be able to reach still render.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
});

const GATED = ['/', '/locations', '/fish', '/id', '/water', '/tides', '/rigs', '/shops', '/start'];

// `/care` is deliberately NOT gated. It is the page that says which of these
// fish will injure you and what to do when one has; `entitlements.ts` marks it
// NEVER GATE THIS. If it ever reappears in GATED, that is a regression with a
// person on the other end of it.
const PUBLIC = ['/welcome', '/privacy', '/support', '/signin', '/signup', '/forgot', '/care'];

describe('signed out', () => {
  for (const path of GATED) {
    it(`sends ${path} to the sign-in page`, () => {
      renderAt(path);
      expect(
        screen.getByRole('heading', { level: 1 }).textContent,
        `${path} rendered instead of redirecting`,
      ).toMatch(/sign in/i);
    });
  }

  for (const path of PUBLIC) {
    it(`still serves ${path}`, () => {
      renderAt(path);
      expect(screen.getAllByRole('heading', { level: 1 }).length).toBe(1);
    });
  }

  it('carries the requested page through, so signing in resumes it', () => {
    renderAt('/locations/emerson-point');
    const link = screen.getByRole('link', { name: /create one/i }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain('next=%2Flocations%2Femerson-point');
  });

  describe('and offline', () => {
    // navigator.onLine is read once at mount by useOnline(), so overriding the
    // property before render is enough and no event dispatch is needed.
    beforeEach(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });
    });

    afterEach(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => true,
      });
    });

    for (const path of GATED) {
      it(`opens ${path} rather than stranding the reader on a form`, () => {
        renderAt(path);
        expect(
          screen.getByRole('heading', { level: 1 }).textContent,
          `${path} redirected to sign-in with no connection — the sign-up it ` +
            `demands cannot be completed, so the guide is bricked at the water`,
        ).not.toMatch(/sign in/i);
      });
    }

    it('still gates once the connection is back', () => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => true,
      });
      renderAt('/locations');
      expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/sign in/i);
    });
  });

  it('refuses an off-site next, which would make sign-in a phishing hop', () => {
    renderAt('/signin?next=https://evil.example.com');
    // Nothing on the page should offer the outside address as a destination.
    const hrefs = [...document.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.includes('evil.example.com'))).toBe(false);
  });
});

describe('signed in', () => {
  beforeEach(() => {
    window.localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ access_token: 't', user: { id: 'u1', email: 'a@b.c' } }),
    );
  });

  it('opens the guide without waiting on a network call', () => {
    renderAt('/');
    // No await, no act: the first synchronous paint is already through the gate.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/you know how to fish/i);
  });

  it('offers a way to reach account settings', () => {
    renderAt('/');
    const cog = screen.getByRole('link', { name: /^settings$/i });
    // The control is a bare glyph, so the accessible name is the only name it
    // has. If that regresses, the settings page becomes unreachable for anyone
    // not using a mouse and the failure is silent.
    expect(cog.getAttribute('href')).toBe('/settings');
  });
});
