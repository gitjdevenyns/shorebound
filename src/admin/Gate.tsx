import { useState } from 'react';
import { useAuth } from '../lib/auth';
import type { ReactNode } from 'react';

/**
 * The door on the owner console.
 *
 * Two locks, and only one of them is here. This component hides the console
 * from anyone who is not an admin — but hiding a screen is not security, and
 * nothing in the bundle could be. The lock that matters is in the database:
 * every table the console writes carries an RLS policy requiring a row in
 * `public.admins`, which only the service role can grant (migration
 * 20260822140000). A signed-in reader who reconstructs these screens by hand
 * still cannot write a single row.
 *
 * So what this is for: keeping the console out of the way of people it is not
 * for, and giving the owner somewhere to sign in.
 */
export default function Gate({ children }: { children: ReactNode }) {
  const { status, user, isAdmin, signIn, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === 'checking') {
    return <div className="authwait" role="status" aria-live="polite" />;
  }

  if (status === 'disabled') {
    return (
      <div className="authwrap">
        <div className="authcard">
          <h1>No backend configured</h1>
          <p className="authlede">
            This build has no <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>,
            so there is nothing for the console to read or write. Set both as build variables and
            redeploy.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'out') {
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      setBusy(true);
      setError(null);
      const result = await signIn(email, password);
      setBusy(false);
      if (!result.ok) setError(result.message ?? 'Could not sign in.');
    };
    return (
      <div className="authwrap">
        <div className="authcard">
          <h1>Owner console</h1>
          <p className="authlede">Sign in with the account that holds admin.</p>
          <form onSubmit={submit} noValidate>
            <div className="authfield">
              <label htmlFor="ad-email">Email address</label>
              <input
                id="ad-email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="authfield">
              <label htmlFor="ad-password">Password</label>
              <input
                id="ad-password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="authnote authnote-bad" role="alert">{error}</p>}
            <button className="btn btn-lime btn-block" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="authwrap">
        <div className="authcard">
          <h1>Not an owner account</h1>
          <p className="authlede">
            {user?.email} is signed in, but has no row in <code>admins</code> — so the database
            would refuse every write on this screen even if it rendered. Admin is granted by the
            service role only, deliberately: it is not something the app can hand itself.
          </p>
          <div className="row g2 wrap">
            <button className="btn btn-ghost" type="button" onClick={() => void signOut()}>
              Sign out
            </button>
            <a className="btn btn-lime" href="/">
              Back to the guide
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
