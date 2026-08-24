import type { ReactElement } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

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
 *   out       — to the sign-in page, carrying where they were headed.
 *
 * Note what is NOT here: any network call. The session comes from local
 * storage, so this resolves on a jetty with no bars exactly as it does at home.
 */
export default function RequireAuth({ children }: { children: ReactElement }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'checking') {
    return (
      <div className="authwait" role="status" aria-live="polite">
        <span className="vh">Checking your session</span>
      </div>
    );
  }

  if (status === 'out') {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/signin?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}
