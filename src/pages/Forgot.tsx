import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthNote, AuthShell, Field } from '../components/AuthShell';
import { useAuth } from '../lib/auth';

export default function Forgot() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const result = await requestPasswordReset(email);
    setBusy(false);
    setNote({
      tone: result.ok ? 'good' : 'bad',
      text: result.message ?? (result.ok ? 'Check your email.' : 'Could not send the link.'),
    });
  };

  return (
    <AuthShell
      title="Reset your password"
      lede="We will email you a link that lets you set a new one."
      footer={<Link to="/signin">Back to sign in</Link>}
    >
      <form onSubmit={submit} noValidate>
        <Field
          id="fp-email" label="Email address" type="email" name="email"
          autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {note && <AuthNote tone={note.tone}>{note.text}</AuthNote>}
        <button className="btn btn-lime btn-block" type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send the link'}
        </button>
      </form>
    </AuthShell>
  );
}
