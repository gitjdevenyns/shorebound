import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// testing-library auto-cleanup only runs with vitest globals enabled;
// we keep globals off, so clean the DOM between tests explicitly.
afterEach(() => {
  cleanup();
});

/**
 * The suite runs as a signed-in reader.
 *
 * `.env.local` gives the test build a Supabase config, so the account gate is
 * live in here exactly as it is in production — which means that without this,
 * every page test would assert against a redirect to /signin instead of the
 * page. Seeding the session storage key is how a returning browser actually
 * looks, so the gate is exercised rather than stubbed out.
 *
 * The signed-OUT behaviour has its own file (auth.test.tsx), which clears this.
 */
import { AUTH_STORAGE_KEY } from '../lib/supabase';
import { beforeEach } from 'vitest';

export const TEST_SESSION = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  token_type: 'bearer',
  // Far enough out that nothing treats it as expired.
  expires_at: 4102444800,
  expires_in: 3600,
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'tester@example.com',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00.000Z',
  },
};

beforeEach(() => {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(TEST_SESSION));
});
