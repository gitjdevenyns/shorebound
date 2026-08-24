import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthNote, AuthShell, Field } from '../components/AuthShell';
import { useAuth } from '../lib/auth';
import { LOCATIONS } from '../data/locations';

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const raw = params.get('next') ?? '/';
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Passwords need to be at least eight characters.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await signUp(email, password, name);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? 'Could not create the account.');
      return;
    }
    // Confirmation on: nothing to do here but say so. Confirmation off: the
    // session already landed and the provider will let them through.
    if (result.needsConfirmation) setSent(result.message ?? 'Check your email.');
    else navigate(next, { replace: true });
  };

  if (sent) {
    return (
      <AuthShell title="Check your email" lede={sent}>
        <p className="authlede">
          The link signs you in and finishes setting up the account. If it does not arrive within a
          few minutes, look in spam — confirmation mail from a new domain often lands there first.
        </p>
        <Link className="btn btn-ghost btn-block" to="/signin">
          Back to sign in
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      lede={`Free. It opens all ${LOCATIONS.length} spots, every species page, the rigs, and the handling guide.`}
      footer={
        <span>
          Already have one? <Link to={`/signin?next=${encodeURIComponent(next)}`}>Sign in</Link>
        </span>
      }
    >
      <form onSubmit={submit} noValidate>
        <Field
          id="su-name" label="Name" type="text" name="name" autoComplete="name"
          hint="What the app calls you. Optional."
          value={name} onChange={(e) => setName(e.target.value)}
        />
        <Field
          id="su-email" label="Email address" type="email" name="email"
          autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          id="su-password" label="Password" type="password" name="password"
          autoComplete="new-password" required minLength={8}
          hint="Eight characters or more."
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        {error && <AuthNote tone="bad">{error}</AuthNote>}
        <button className="btn btn-lime btn-block" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <p className="authfine">
          By creating an account you agree to how the app handles your data, which is set out in
          full on the <Link to="/privacy">privacy page</Link>. Short version: your email, so you can
          sign in — and nothing else that identifies you. Your location never leaves your device.
        </p>
      </form>
    </AuthShell>
  );
}
