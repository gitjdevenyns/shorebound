import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

/**
 * Accounts.
 *
 * Everything on this screen goes through a security-definer function or the
 * `admin-users` Edge Function, both of which re-check admin membership on the
 * server. Nothing here is trusted because the screen rendered — the screen
 * rendering is a convenience; the database is the authority.
 *
 * One deliberate omission: there is no "set this person's password" control.
 * The console can send a reset link, which lets them choose one. An owner who
 * can read or write somebody's password is a liability to the owner as much as
 * to the user, so the capability simply is not built.
 */
interface Account {
  id: string;
  email: string | null;
  display_name: string | null;
  tier: 'free' | 'paid';
  is_admin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

interface Stats {
  total: number;
  confirmed: number;
  paid: number;
  last_7_days: number;
  last_30_days: number;
}

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export default function Users() {
  const configured = isSupabaseConfigured();
  const [rows, setRows] = useState<Account[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ tone: 'good' | 'bad'; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftEmail, setDraftEmail] = useState('');

  const load = useCallback(async (term: string) => {
    const cp = getSupabaseClient();
    if (!cp) return;
    const supabase = await cp;
    const [{ data: list, error: listError }, { data: agg }] = await Promise.all([
      supabase.rpc('admin_list_users', { search: term || null, limit_n: 500 }),
      supabase.rpc('admin_signup_stats'),
    ]);
    if (listError) {
      setNote({ tone: 'bad', text: listError.message });
      return;
    }
    setRows((list ?? []) as Account[]);
    setStats(((agg ?? [])[0] ?? null) as Stats | null);
  }, []);

  useEffect(() => {
    if (!configured) return;
    void load('').catch((e: unknown) =>
      setNote({ tone: 'bad', text: e instanceof Error ? e.message : 'Could not load accounts.' }),
    );
  }, [configured, load]);

  // Filtering is server-side so a large list stays one query, but the search
  // box should not fire on every keystroke.
  useEffect(() => {
    if (!configured) return;
    const t = setTimeout(() => void load(search).catch(() => undefined), 250);
    return () => clearTimeout(t);
  }, [search, configured, load]);

  const call = useCallback(
    async (fn: () => Promise<{ error?: { message: string } | null; message?: string }>, key: string) => {
      setBusy(key);
      setNote(null);
      try {
        const result = await fn();
        if (result?.error) setNote({ tone: 'bad', text: result.error.message });
        else setNote({ tone: 'good', text: result?.message ?? 'Done.' });
      } catch (e) {
        setNote({ tone: 'bad', text: e instanceof Error ? e.message : 'Failed.' });
      }
      setBusy(null);
      await load(search).catch(() => undefined);
    },
    [load, search],
  );

  const setTier = (a: Account, next: 'free' | 'paid') =>
    call(async () => {
      const supabase = await getSupabaseClient()!;
      const { error } = await supabase.rpc('admin_set_tier', { target: a.id, next_tier: next });
      return { error, message: `${a.email} is now ${next}.` };
    }, `tier-${a.id}`);

  const rename = (a: Account) =>
    call(async () => {
      const supabase = await getSupabaseClient()!;
      const { error } = await supabase.rpc('admin_set_display_name', {
        target: a.id,
        next_name: draftName,
      });
      return { error, message: 'Name updated.' };
    }, `name-${a.id}`);

  const invokeFn = async (body: Record<string, unknown>) => {
    const supabase = await getSupabaseClient()!;
    const { data, error } = await supabase.functions.invoke('admin-users', { body });
    if (error) return { error: { message: error.message } };
    const payload = (data ?? {}) as { error?: string; message?: string };
    if (payload.error) return { error: { message: payload.error } };
    return { message: payload.message ?? 'Done.' };
  };

  // Approving by hand is the exception, not the route. Email confirmation
  // stays the default for everyone who signs up; this exists for when that
  // path fails — a bounced address, a link in spam, an exhausted send quota,
  // or somebody signing up at a shop counter with the owner standing there.
  const approve = (a: Account) =>
    call(() => invokeFn({ action: 'confirm_user', user_id: a.id }), `ok-${a.id}`);

  const sendReset = (a: Account) =>
    call(
      () =>
        invokeFn({
          action: 'reset_password',
          user_id: a.id,
          redirect_to: `${window.location.origin}/reset`,
        }),
      `reset-${a.id}`,
    );

  const changeEmail = (a: Account) =>
    call(() => invokeFn({ action: 'set_email', user_id: a.id, email: draftEmail }), `email-${a.id}`);

  const removeUser = (a: Account) => {
    if (!window.confirm(`Delete ${a.email}? This cannot be undone.`)) return;
    return call(() => invokeFn({ action: 'delete_user', user_id: a.id }), `del-${a.id}`);
  };

  const paidCount = useMemo(() => rows.filter((r) => r.tier === 'paid').length, [rows]);
  const pending = useMemo(() => rows.filter((r) => !r.email_confirmed_at), [rows]);
  const shown = pendingOnly ? pending : rows;

  if (!configured) {
    return <p className="adm-note">No Supabase config in this build — nothing to show.</p>;
  }

  return (
    <div className="adm-pane">
      <h2>Accounts</h2>

      {stats && (
        <div className="adm-stats">
          <div><b>{stats.total}</b><span>accounts</span></div>
          <div><b>{stats.confirmed}</b><span>confirmed</span></div>
          <div><b>{stats.paid}</b><span>paid</span></div>
          <div><b>{stats.last_7_days}</b><span>joined this week</span></div>
          <div><b>{stats.last_30_days}</b><span>joined this month</span></div>
        </div>
      )}

      {note && (
        <p className={`authnote authnote-${note.tone}`} role={note.tone === 'bad' ? 'alert' : 'status'}>
          {note.text}
        </p>
      )}

      <div className="authfield" style={{ maxWidth: 340 }}>
        <label htmlFor="usr-search">Search by email or name</label>
        <input
          id="usr-search" type="search" value={search}
          onChange={(e) => setSearch(e.target.value)} placeholder="anything@…"
        />
      </div>

      <p className="adm-note">
        Showing {shown.length} {shown.length === 1 ? 'account' : 'accounts'}
        {paidCount > 0 && <> · {paidCount} on paid</>}
        {pending.length > 0 && (
          <>
            {' · '}
            <button type="button" className="adm-link" onClick={() => setPendingOnly((v) => !v)}>
              {pendingOnly
                ? 'show everyone'
                : `${pending.length} awaiting confirmation`}
            </button>
          </>
        )}
      </p>
      <p className="adm-note adm-fine">
        Accounts confirm themselves by email — that stays the default and nothing here changes it.
        Approving one by hand says <em>you</em> vouch for the person, which is a different claim
        from the address having been proven reachable. Both are recorded, and which one happened is
        kept in the audit log.
      </p>

      <table className="adm-table">
        <thead>
          <tr>
            <th scope="col">Account</th>
            <th scope="col">Tier</th>
            <th scope="col">Joined</th>
            <th scope="col">Last seen</th>
            <th scope="col"><span className="vh">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {shown.map((a) => (
            <tr key={a.id}>
              <td>
                <b>{a.email ?? '—'}</b>
                <div className="adm-sub">
                  {a.display_name || <em>no name set</em>}
                  {a.is_admin && <span className="adm-pill">owner</span>}
                  {!a.email_confirmed_at && (
                    <>
                      <span className="adm-pill adm-pill-warn">awaiting confirmation</span>
                      <button
                        type="button"
                        className="adm-approve"
                        disabled={busy === `ok-${a.id}`}
                        onClick={() => void approve(a)}
                        title="Confirm this account yourself instead of waiting for the email"
                      >
                        {busy === `ok-${a.id}` ? 'Approving…' : 'Approve'}
                      </button>
                    </>
                  )}
                </div>
              </td>
              <td>
                <button
                  type="button"
                  className={`btn ${a.tier === 'paid' ? 'btn-lime' : 'btn-ghost'}`}
                  disabled={busy === `tier-${a.id}`}
                  onClick={() => void setTier(a, a.tier === 'paid' ? 'free' : 'paid')}
                >
                  {a.tier === 'paid' ? 'Paid' : 'Free'}
                </button>
              </td>
              <td>{when(a.created_at)}</td>
              <td>{when(a.last_sign_in_at)}</td>
              <td>
                <button
                  type="button" className="btn btn-ghost"
                  onClick={() => {
                    const next = open === a.id ? null : a.id;
                    setOpen(next);
                    setDraftName(a.display_name ?? '');
                    setDraftEmail(a.email ?? '');
                  }}
                  aria-expanded={open === a.id}
                >
                  {open === a.id ? 'Close' : 'Manage'}
                </button>

                {open === a.id && (
                  <div className="adm-manage">
                    <div className="authfield">
                      <label htmlFor={`n-${a.id}`}>Name</label>
                      <input
                        id={`n-${a.id}`} type="text" value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                      />
                      <button
                        type="button" className="btn btn-blue"
                        disabled={busy === `name-${a.id}`}
                        onClick={() => void rename(a)}
                      >
                        Save name
                      </button>
                    </div>

                    <div className="authfield">
                      <label htmlFor={`e-${a.id}`}>Email address</label>
                      <input
                        id={`e-${a.id}`} type="email" value={draftEmail}
                        onChange={(e) => setDraftEmail(e.target.value)}
                      />
                      <span className="authhint">
                        Changes what they sign in with, and marks it confirmed. Tell them first.
                      </span>
                      <button
                        type="button" className="btn btn-blue"
                        disabled={busy === `email-${a.id}` || draftEmail === a.email}
                        onClick={() => void changeEmail(a)}
                      >
                        Change address
                      </button>
                    </div>

                    <div className="authfield">
                      <span className="authhint">
                        A reset link lets them set their own password. There is deliberately no way
                        to set it for them — nobody should be able to know somebody else&rsquo;s
                        password, including you.
                      </span>
                      <button
                        type="button" className="btn btn-ghost"
                        disabled={busy === `reset-${a.id}`}
                        onClick={() => void sendReset(a)}
                      >
                        Send password reset
                      </button>
                    </div>

                    {!a.is_admin && (
                      <button
                        type="button" className="btn btn-ghost btn-danger"
                        disabled={busy === `del-${a.id}`}
                        onClick={() => void removeUser(a)}
                      >
                        Delete this account
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
