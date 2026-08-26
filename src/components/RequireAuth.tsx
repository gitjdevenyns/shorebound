import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useOnline } from '../lib/network';

/**
 * The gate.
 *
 * Four states, and three of them let you through:
 *
 *   checking  — the stored session is still being read. Hold, do not redirect.
 *               Bouncing somebody to a login screen for the 80ms it takes to
 *               read local storage is how a signed-in user gets logged out on
 *               every cold start.
 *   in        — through.
 *   disabled  — this build has no Supabase config, so there is no account
 *               system to gate on. Through. A missing backend must not turn
 *               the guide into a brick; local development and the test suite
 *               both land here.
 *   out       — to the sign-in page, carrying where they were headed —
 *               UNLESS the device is offline, in which case: through.
 *
 * Note what is NOT here: any network call. The session comes from local
 * storage, so this resolves on a jetty with no bars exactly as it does at home.
 *
 * WHY OFFLINE GOES THROUGH
 *
 * It resolved offline, but it resolved to a redirect — and the destination is a
 * form that cannot be completed without a network. Install the app, drive to
 * the pass, lose signal, and the product was a login screen you could not get
 * past, with all 25 spots already precached on the device. That is the one
 * thing CLAUDE.md says a design may never do: degrading gracefully is fine,
 * blocking the app is not.
 *
 * Letting an offline reader through costs nothing that was ever protected. The
 * gate is a UI gate by design and is documented as such — the guide compiles
 * into the bundle and is readable signed in or not, so the gate drives sign-ups
 * rather than keeping secrets. Anything genuinely private lives behind RLS as
 * data, and none of that is reachable offline anyway. And a reader with no
 * connection could not have signed up in this moment regardless, so the funnel
 * loses nothing real: the gate still stands on every online launch, which is
 * every launch where signing up is actually possible.
 *
 * WHY THE LATCH
 *
 * `useOnline()` is live, so without this the first check was re-run on every
 * render: a reader let through at the pass was thrown to a sign-in form the
 * instant one bar of signal came back — mid-page, losing where he was. That is
 * the same brick, just delayed, and it would arrive at the least forgivable
 * moment. So passing through offline latches for the life of the page: once the
 * guide is open it stays open.
 *
 * The latch is module-scoped and deliberately not persisted. A reload is a new
 * launch, and if that launch has a connection the gate stands again — which is
 * exactly the sentence above, kept true.
 */
let offlineGrace = false;

/** Test seam: the latch outlives a component, so a suite must be able to clear it. */
export function __resetOfflineGrace() {
  offlineGrace = false;
}

export default function RequireAuth({ children }: { children: ReactElement }) {
  const { status } = useAuth();
  const online = useOnline();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="authwait" role="status" aria-live="polite">
        <span className="vh">Checking your session</span>
      </div>
    );
  }

  if (status === 'out' && !online) offlineGrace = true;

  if (status === 'out' && online && !offlineGrace) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/signin?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}
