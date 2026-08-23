import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * SPA fallback for a deep link like /locations/emerson-point.
 *
 * Cloudflare Pages serves it from `public/_redirects`. This keeps a 404.html
 * copy as well, because GitHub Pages (and most static hosts) fall back to that
 * file instead, and one stale deploy target serving broken deep links is not
 * worth the two lines it costs to avoid.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist');
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
    },
  };
}

export default defineConfig({
  // Served from the root of shorebound.app. Was '/GCF/' when this lived on a
  // github.io project path; every absolute URL below moved with it.
  base: '/',
  build: {
    rollupOptions: {
      // Two entries, deliberately. `index.html` is the guide readers install;
      // `admin.html` is owner tooling. Keeping them separate means the admin
      // console's code, its review queue and its Supabase auth never land in
      // the bundle a reader downloads, and — see `globIgnores` below — never
      // enter the service worker precache either.
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
      output: {
        // The dynamically imported Supabase SDK otherwise lands in a 200 kB
        // chunk called `dist-<hash>.js`, named after a directory in its package
        // path. Name it for what it is, so a cache entry or a slow request in
        // devtools is self-explanatory.
        chunkFileNames(chunk) {
          const name =
            chunk.name === 'dist' && chunk.moduleIds?.some((id) => id.includes('@supabase'))
              ? 'supabase'
              : chunk.name;
          return `assets/${name}-[hash].js`;
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Keep the same manifest filename the old app used.
      manifestFilename: 'manifest.webmanifest',
      // icons live in public/assets/ (same public paths as the old app)
      // NOTE: deliberately no `includeAssets`. It adds public/ files to the
      // precache by path, but `workbox.globPatterns` below already sweeps the
      // built dist/ — which contains those same copied files. Listing an asset
      // in both produces two manifest entries for one URL (one revisioned, one
      // not), and Workbox aborts the install with
      // `add-to-cache-list-conflicting-entries`. The worker then never installs
      // and the app has no offline support at all.
      manifest: {
        id: '/',
        name: 'Shorebound',
        short_name: 'Shorebound',
        description:
          "Shore fishing guide for Florida's Gulf coast — 25 researched spots, "
          + 'live tide, and the rig for each one. Works offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        lang: 'en-US',
        dir: 'ltr',
        categories: ['navigation', 'education', 'sports'],
        background_color: '#05080d',
        theme_color: '#05080d',
        icons: [
          // `any` and `maskable` are deliberately separate: the square PNGs have
          // no safe-zone padding, so declaring them maskable would let platforms
          // crop the artwork. The SVG is drawn inside the 80% safe circle.
          { src: 'assets/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'assets/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          // Raster, not SVG: Bubblewrap's TWA build rejects an SVG maskable,
          // and the manifest has to name the same asset the store package uses.
          {
            src: 'assets/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Inline the Workbox runtime into sw.js instead of importScripts-ing a
        // second file through an AMD shim. With the split build the precache
        // install handler is registered from an async module factory, and it can
        // lose the race with the service worker's own `install` event — the
        // worker then activates having cached nothing, which silently defeats
        // the entire offline story. Inlining keeps registration synchronous.
        inlineWorkboxRuntime: true,
        // Versioned precache of the app shell (hashed JS/CSS + local assets).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
        // vite-plugin-pwa already precaches the webmanifest and every icon it
        // declares, with its own revision hashes. Globbing them again yields a
        // second, unrevisioned entry for the same URL, and Workbox aborts the
        // install with `add-to-cache-list-conflicting-entries` — no install
        // means no offline support at all, and it fails silently in the
        // split-runtime build. Let the plugin own these four.
        globIgnores: [
          'assets/icon-192.png',
          'assets/icon-512.png',
          'assets/icon-maskable-512.png',
          'manifest.webmanifest',
          // Owner tooling. Precaching it would push the admin console onto
          // every reader's device and make it available offline, which is both
          // wasted bytes and wrong: every action in there is a network write.
          // `src/test/admin.bundle.test.ts` asserts this stays true.
          'admin.html',
          'assets/admin-*.js',
          'assets/admin-*.css',
        ],
        // SPA offline fallback: any navigation not in the cache serves the
        // precached index.html (bundled data means the whole guide works offline).
        navigateFallback: '/index.html',
        navigationPreload: false,
        cleanupOutdatedCaches: true,
        // `registerType: 'autoUpdate'` only sets skipWaiting, so a new worker
        // activated but did not take over tabs that were already open — they
        // kept being served the previous shell out of the old precache until
        // the user happened to navigate. Someone sitting on the home page saw
        // the last release indefinitely and reported the fix as not working.
        // Claiming them hands over immediately; `installUpdateRecovery` in
        // src/lib/appUpdate.ts listens for that handover and reloads once, so
        // the swap lands on a shell that matches the assets now being served
        // instead of a half-updated one.
        clientsClaim: true,
        runtimeCaching: [
          {
            // Dynamic content (future cached weather/tide snapshots) —
            // always prefer the network, fall back to last good copy.
            urlPattern: /^https:\/\/[a-z0-9-]+\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'shorebound-supabase',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 },
              // Only cache real successes — never opaque/failed responses.
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Same-origin static files not in the precache manifest.
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'shorebound-static',
              expiration: { maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
    spaFallback(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    globals: false,
    // `.claude/worktrees/` holds full checkouts of this repo for agent work.
    // They carry their own copy of this suite, so without this the local run
    // silently tests other branches' code alongside this one — inflating the
    // count and failing on work that is not in this tree. CI checks out clean,
    // so this is purely local/CI parity.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
    // Several route tests render all 23 routes in one case (15 location pages
    // plus the species pages, each mounting a Leaflet map into jsdom). That is
    // legitimately slower than the 5s default.
    testTimeout: 30_000,
  },
});
