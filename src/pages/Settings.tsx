import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { LOCATIONS } from '../data/locations';
import { SUPPORT_EMAIL } from '../data/contact';

/**
 * Everything a person can change about their own account.
 *
 * The two irreversible things on this page — changing the password and deleting
 * the account — both make you prove it is you first, and neither happens on a
 * single click. Everything else saves as you go.
 */
export default function Settings() {
  const { user, profile, isAdmin, signOut, updatePassword, updateProfile, deleteAccount } =
    useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [note, setNote] = useState<{ tone: 'good' | 'bad'; text: string } | null>(
    params.get('changed') ? { tone: 'good', text: 'Password updated.' } : null,
  );

  const [name, setName] = useState(profile?.display_name ?? '');
  const [home, setHome] = useState(profile?.home_slug ?? '');
  const [units, setUnits] = useState<'imperial' | 'metric'>(profile?.units ?? 'imperial');
  const [optIn, setOptIn] = useState(profile?.marketing_opt_in ?? false);

  // The profile arrives a beat after the session on a cold load.
  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? '');
    setHome(profile.home_slug ?? '');
    setUnits(profile.units);
    setOptIn(profile.marketing_opt_in);
  }, [profile]);

  const [pw, setPw] = useState('');
  const [pwAgain, setPwAgain] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('profile');
    const result = await updateProfile({
      display_name: name.trim() || null,
      home_slug: home || null,
      units,
      marketing_opt_in: optIn,
    });
    setBusy(null);
    setNote(
      result.ok
        ? { tone: 'good', text: 'Saved.' }
        : { tone: 'bad', text: result.message ?? 'Could not save.' },
    );
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return setNote({ tone: 'bad', text: 'Passwords need to be at least eight characters.' });
    if (pw !== pwAgain) return setNote({ tone: 'bad', text: 'Those two do not match.' });
    setBusy('password');
    const result = await updatePassword(pw);
    setBusy(null);
    setPw('');
    setPwAgain('');
    setNote(
      result.ok
        ? { tone: 'good', text: 'Password updated.' }
        : { tone: 'bad', text: result.message ?? 'Could not update the password.' },
    );
  };

  const remove = async () => {
    setBusy('delete');
    const result = await deleteAccount(confirmEmail);
    setBusy(null);
    if (result.ok) navigate('/welcome', { replace: true });
    else setNote({ tone: 'bad', text: result.message ?? 'Could not delete the account.' });
  };

  return (
    <>
      <div className="sect">
        <div className="lab lab-blue">Your account</div>
        <h1 style={{ margin: '4px 0 8px' }}>Settings</h1>
        <p className="mut">
          Signed in as <b>{user?.email}</b>
          {profile?.tier === 'paid' ? ' · paid' : ' · free'}
          {isAdmin && ' · owner'}
        </p>
        {note && (
          <p className={`authnote authnote-${note.tone}`} role={note.tone === 'bad' ? 'alert' : 'status'}>
            {note.text}
          </p>
        )}
      </div>

      <section className="sect" aria-labelledby="set-you">
        <h2 id="set-you">About you</h2>
        <form className="setform" onSubmit={saveProfile}>
          <div className="authfield">
            <label htmlFor="set-name">Name</label>
            <input
              id="set-name" type="text" autoComplete="name" value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <span className="authhint">What the app calls you.</span>
          </div>

          <div className="authfield">
            <label htmlFor="set-home">Home water</label>
            <select id="set-home" value={home} onChange={(e) => setHome(e.target.value)}>
              <option value="">No home spot set</option>
              {LOCATIONS.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.name}
                </option>
              ))}
            </select>
            <span className="authhint">
              The spot the app falls back to when it cannot tell where you are.
            </span>
          </div>

          <fieldset className="authfield">
            <legend>Units</legend>
            <label className="setradio">
              <input
                type="radio" name="units" value="imperial" checked={units === 'imperial'}
                onChange={() => setUnits('imperial')}
              />
              <span>Feet and miles</span>
            </label>
            <label className="setradio">
              <input
                type="radio" name="units" value="metric" checked={units === 'metric'}
                onChange={() => setUnits('metric')}
              />
              <span>Metres and kilometres</span>
            </label>
            <span className="authhint">
              Tide heights come from NOAA in feet and are converted for display.
            </span>
          </fieldset>

          <label className="setcheck">
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
            <span>
              Email me when spots, species or seasonal notes are added. Rare, and never sold on.
            </span>
          </label>

          <button className="btn btn-lime" type="submit" disabled={busy === 'profile'}>
            {busy === 'profile' ? 'Saving…' : 'Save'}
          </button>
        </form>
      </section>

      <section className="sect" aria-labelledby="set-pw">
        <h2 id="set-pw">Password</h2>
        <form className="setform" onSubmit={savePassword}>
          <div className="authfield">
            <label htmlFor="set-pw1">New password</label>
            <input
              id="set-pw1" type="password" autoComplete="new-password" minLength={8}
              value={pw} onChange={(e) => setPw(e.target.value)}
            />
            <span className="authhint">Eight characters or more.</span>
          </div>
          <div className="authfield">
            <label htmlFor="set-pw2">New password again</label>
            <input
              id="set-pw2" type="password" autoComplete="new-password"
              value={pwAgain} onChange={(e) => setPwAgain(e.target.value)}
            />
          </div>
          <button className="btn btn-blue" type="submit" disabled={busy === 'password'}>
            {busy === 'password' ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </section>

      <section className="sect" aria-labelledby="set-priv">
        <h2 id="set-priv">Location and privacy</h2>
        <p className="mut">
          The app asks for your location only when you tap something that needs it, and the
          coordinates never leave your device — no spot suggestion, no distance and no ranking is
          ever computed on a server. To take the permission back, use your browser or phone
          settings for this site; nothing here can revoke it on your behalf.{' '}
          <Link to="/privacy">What is stored, in full</Link>.
        </p>
      </section>

      {isAdmin && (
        <section className="sect" aria-labelledby="set-owner">
          <h2 id="set-owner">Owner tools</h2>
          <p className="mut">
            The console for the review queue, shop listings, advertising and the free/paid matrix
            is a separate browser-only build.
          </p>
          <a className="btn btn-ghost" href="/admin.html">
            Open the owner console
          </a>
        </section>
      )}

      <section className="sect" aria-labelledby="set-out">
        <h2 id="set-out">Sign out</h2>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            void signOut().then(() => navigate('/welcome', { replace: true }));
          }}
        >
          Sign out on this device
        </button>
      </section>

      <section className="sect danger-zone" aria-labelledby="set-del" style={{ paddingBottom: 'var(--s7)' }}>
        <h2 id="set-del">Delete your account</h2>
        <p className="mut">
          This removes the account and everything attached to it. It cannot be undone, and it is not
          a way to pause — there is nothing to restore afterwards. Questions first?{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
        {!armed ? (
          <button className="btn btn-ghost btn-danger" type="button" onClick={() => setArmed(true)}>
            Delete my account
          </button>
        ) : (
          <div className="setform">
            <div className="authfield">
              <label htmlFor="set-del-c">
                Type <b>{user?.email}</b> to confirm
              </label>
              <input
                id="set-del-c" type="email" autoComplete="off" value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
              />
            </div>
            <div className="row g2 wrap">
              <button
                className="btn btn-danger" type="button" onClick={remove}
                disabled={
                  busy === 'delete' ||
                  confirmEmail.trim().toLowerCase() !== (user?.email ?? '').toLowerCase()
                }
              >
                {busy === 'delete' ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => setArmed(false)}>
                Keep my account
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
