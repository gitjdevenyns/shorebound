/**
 * Recovery from a redeploy landing under a running tab.
 *
 * The app is a PWA whose service worker precaches the hashed app shell, and it
 * is deployed by replacing the whole of `dist/` on GitHub Pages. Those two
 * facts combine badly, and did in production:
 *
 *   1. `registerType: 'autoUpdate'` builds a worker with skipWaiting +
 *      clientsClaim, so a new worker activates and takes over the page — but
 *      the injected `registerSW.js` only calls `register()`. Nothing reloads
 *      the tab, so it goes on running the *old* shell from the old precache,
 *      indefinitely. The user sees the previous release and reasonably reports
 *      that a fix "didn't work".
 *   2. That stale shell still asks for its own hashed lazy chunks. The deploy
 *      deleted them from the server and `cleanupOutdatedCaches` dropped them
 *      from the cache, so the dynamic import rejects, React.lazy throws, and
 *      the route dies with "This screen failed to load".
 *
 * Both are fixed by reloading once at the moment we learn the tab is stale.
 * The reload is rate-limited: if the fresh load fails the same way, we must
 * not put the browser in a refresh loop, so we would rather show a broken page
 * that a human can read than spin forever.
 */

const RELOAD_KEY = 'shorebound:update-reload';
/** Long enough that a reload loop cannot form, short enough to retry later. */
const RELOAD_COOLDOWN_MS = 15_000;

function reloadOnce(reason: string): void {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  } catch {
    /* storage blocked (private mode); fall through and allow one reload */
  }
  if (Date.now() - last < RELOAD_COOLDOWN_MS) {
    console.warn(`[shorebound] skipping reload (${reason}) — one just happened`);
    return;
  }
  try {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  console.info(`[shorebound] reloading to pick up a new build (${reason})`);
  window.location.reload();
}

export function installUpdateRecovery(): void {
  if (typeof window === 'undefined') return;

  // A stale chunk is the failure users actually see, and it can happen before
  // the worker swap is observed, so handle it on its own. Vite fires this when
  // a dynamic import's asset cannot be fetched.
  window.addEventListener('vite:preloadError', (event) => {
    // Prevent Vite's default rethrow: the reload below is the recovery, and an
    // unhandled rejection on the way out adds nothing.
    event.preventDefault();
    reloadOnce('a code chunk from the previous build is gone');
  });

  const sw = navigator.serviceWorker;
  if (!sw) return;

  // `controllerchange` also fires the first time a worker claims a page that
  // never had one. That page is already current — reloading it would just cost
  // every first-time visitor an extra load — so the first handover only arms
  // the flag. Every one after it is a genuinely new build replacing the shell
  // this document was served from, and that does need a reload.
  //
  // The flag has to be mutable, not a snapshot taken at module load: a first
  // visit starts with no controller at all, so a captured `false` would stay
  // false for the life of the tab and silently disable this whole recovery.
  let controlled = Boolean(sw.controller);
  sw.addEventListener('controllerchange', () => {
    if (!controlled) {
      controlled = true;
      return;
    }
    reloadOnce('a new service worker took control');
  });

  // Claiming only helps once the browser has actually fetched the new worker,
  // and it only does that on a navigation or its own ~24h schedule. A tab left
  // sitting on one screen would therefore keep showing a stale build for as
  // long as it stayed there. Ask explicitly whenever the reader comes back to
  // the tab, which is exactly when a stale screen is about to be looked at.
  let lastCheck = 0;
  const checkForUpdate = () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastCheck < 60_000) return;
    lastCheck = Date.now();
    sw.getRegistration().then((reg) => reg?.update()).catch(() => {
      /* offline, or the worker is gone; nothing to do */
    });
  };
  document.addEventListener('visibilitychange', checkForUpdate);
  window.addEventListener('focus', checkForUpdate);
  checkForUpdate();
}
