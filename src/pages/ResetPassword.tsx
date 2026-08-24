import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthNote, AuthShell, Field } from '../components/AuthShell';
import { useAuth } from '../lib/auth';

/**
 * Where the emailed reset link lands.
 *
 * The link carries a recovery token that the Supabase client exchanges for a
 * session on load — which is why `detectSessionInUrl` has to be on. By the time
 * this renders, the visitor is signed in for exactly long enough to set a new
 * password, so the only thing on the page is that.
 */
export default function ResetPassword() {
  const { status, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Passwords need to be at least eight characters.');
    if (password !== again) return setError('Those two do not match.');
    setBusy(true);
    setError(null);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.ok) navigate('/settings?changed=1', { replace: true });
    else setError(result.message ?? 'Could not set the password.');
  };

  if (status === 'out') {
    return (
      <AuthShell
        title="That link has expired"
        lede="Reset links are good for one hour and one use. Ask for a fresh one."
        footer={<Link to="/signin">Back to sign in</Link>}
      >
        <Link className="btn btn-lime btn-block" to="/forgot">
          Send a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" lede="Then you are back in.">
      <form onSubmit={submit} noValidate>
        <Field
          id="rp-password" label="New password" type="password" name="password"
          autoComplete="new-password" required minLength={8} hint="Eight characters or more."
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          id="rp-again" label="New password again" type="password" name="password_confirm"
          autoComplete="new-password" required value={again}
          onChange={(e) => setAgain(e.target.value)}
        />
        {error && <AuthNote tone="bad">{error}</AuthNote>}
        <button className="btn btn-lime btn-block" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save the new password'}
        </button>
      </form>
    </AuthShell>
  );
}
