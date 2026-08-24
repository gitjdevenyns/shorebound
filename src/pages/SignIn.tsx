import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthNote, AuthShell, Field } from '../components/AuthShell';
import { useAuth } from '../lib/auth';

export default function SignIn() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Where the guard sent them from, so signing in resumes what they were doing
  // instead of dumping everyone on the home page. Only same-origin paths are
  // honoured — an open redirect is how a sign-in page becomes a phishing tool.
  const raw = params.get('next') ?? '/';
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.ok) navigate(next, { replace: true });
    else setError(result.message ?? 'Could not sign in.');
  };

  return (
    <AuthShell
      title="Sign in"
      lede="Your spots, tides and settings, on whatever you are carrying."
      footer={
        <>
          <span>
            No account yet? <Link to={`/signup?next=${encodeURIComponent(next)}`}>Create one</Link>
          </span>
          <Link to="/forgot">Forgot your password?</Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <Field
          id="si-email" label="Email address" type="email" name="email"
          autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          id="si-password" label="Password" type="password" name="password"
          autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <AuthNote tone="bad">{error}</AuthNote>}
        <button className="btn btn-lime btn-block" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
