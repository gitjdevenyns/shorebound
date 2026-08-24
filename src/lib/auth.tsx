/**
 * Accounts.
 *
 * Everything the app needs to know about who is signed in, in one place.
 *
 * THE GATE IS A UI GATE. Say it here so nobody is misled by it later: the
 * guide's content — every location, species, rig and handling note — is
 * compiled into the JavaScript bundle and served as a static asset. Requiring
 * an account stops a casual visitor from using the app; it does not make the
 * content secret, because the bundle is fetched before anyone signs in.
 * Anything that must actually be private has to live behind RLS as data, not
 * ship in the bundle.
 *
 * OFFLINE IS NOT SIGNED OUT. This is the rule the whole design bends around.
 * The guide's job is to work on a jetty with no bars, so authentication must
 * never require a round trip. `supabase.auth.getSession()` reads local storage
 * and does not touch the network, so a session stored at the dock is still a
 * session in the mangroves. Token refresh will fail out there; that is fine,
 * because nothing the reader needs offline is behind a token. What must NOT
 * happen is a failed refresh being read as a sign-out and dumping somebody at
 * a login screen they cannot complete.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { AUTH_STORAGE_KEY, getSupabaseClient, isSupabaseConfigured } from './supabase';

export type Tier = 'free' | 'paid';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  tier: Tier;
  units: 'imperial' | 'metric';
  home_slug: string | null;
  marketing_opt_in: boolean;
}

/**
 * 'checking'  — reading the stored session; render nothing that depends on it.
 * 'in'        — a session exists locally. May be offline; may be stale.
 * 'out'       — no stored session.
 * 'disabled'  — this build has no Supabase config, so there are no accounts.
 *               The gate opens: a build without a backend must not be a brick.
 */
export type AuthStatus = 'checking' | 'in' | 'out' | 'disabled';

export interface AuthResult {
  ok: boolean;
  /** Present when ok is false, or when a sign-up needs its email confirmed. */
  message?: string;
  /** True when the account was created but no session came back with it. */
  needsConfirmation?: boolean;
}

export interface AuthValue {
  status: AuthStatus;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string, displayName?: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<AuthResult>;
  updatePassword(next: string): Promise<AuthResult>;
  updateProfile(patch: Partial<Omit<Profile, 'id' | 'email' | 'tier'>>): Promise<AuthResult>;
  deleteAccount(confirmEmail: string): Promise<AuthResult>;
  refreshProfile(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Is there a stored session, right now, without awaiting anything?
 *
 * This decides the FIRST paint. Getting the session properly means loading the
 * Supabase SDK — a dynamic import, so at minimum a microtask and in practice a
 * network fetch of the chunk — and holding every gated page blank until it
 * lands. On a cold start that is a visible flash of nothing for a reader who
 * has been signed in for months.
 *
 * The stored blob is the same thing the SDK is about to read. Trusting its
 * presence for the first paint is optimistic in exactly one direction: if it
 * turns out to be expired or corrupt, the async pass below corrects to 'out' a
 * moment later. Erring the other way — assuming signed-out until proven
 * otherwise — logs people out of an offline-first app every time they open it.
 */
function hasStoredSession(): boolean {
  try {
    return Boolean(globalThis.localStorage?.getItem(AUTH_STORAGE_KEY));
  } catch {
    // Private mode, or storage blocked outright. Nothing is stored, so nobody
    // is signed in; the sign-in page will say so when they try.
    return false;
  }
}

/** Supabase's messages are written for developers. These are for people. */
function humanise(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return 'That email and password do not match an account.';
  }
  if (m.includes('email not confirmed')) {
    return 'Check your email and confirm the address before signing in.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'There is already an account with that address. Try signing in instead.';
  }
  if (m.includes('password should be at least')) {
    return 'Passwords need to be at least eight characters.';
  }
  // Two different limits wearing the same word, and telling them apart matters:
  // one is about this person, the other is not about them at all.
  if (m.includes('email rate limit') || m.includes('over_email_send_rate_limit')) {
    return 'Sign-ups are temporarily paused — the confirmation email service has hit '
      + 'its hourly limit. This is on our side, not yours. Try again in an hour.';
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts from this device. Wait a minute and try again.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'No connection. This needs the internet — the rest of the guide does not.';
  }
  return message;
}

const asProfile = (row: Record<string, unknown> | null): Profile | null =>
  row
    ? {
        id: String(row.id),
        email: (row.email as string | null) ?? null,
        display_name: (row.display_name as string | null) ?? null,
        tier: row.tier === 'paid' ? 'paid' : 'free',
        units: row.units === 'metric' ? 'metric' : 'imperial',
        home_slug: (row.home_slug as string | null) ?? null,
        marketing_opt_in: Boolean(row.marketing_opt_in),
      }
    : null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [status, setStatus] = useState<AuthStatus>(() =>
    !configured ? 'disabled' : hasStoredSession() ? 'in' : 'out',
  );
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const clientRef = useRef<SupabaseClient | null>(null);

  const client = useCallback(async (): Promise<SupabaseClient | null> => {
    if (clientRef.current) return clientRef.current;
    const cp = getSupabaseClient();
    if (!cp) return null;
    clientRef.current = await cp;
    return clientRef.current;
  }, []);

  /**
   * The profile and admin flag are network reads, so they are allowed to fail.
   * Failing means offline, and offline must not sign anybody out — the session
   * stands on its own and the app falls back to the free tier's shape until a
   * connection returns.
   */
  const loadProfile = useCallback(
    async (supabase: SupabaseClient, uid: string) => {
      try {
        const [{ data: row }, { data: adminRow }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, email, display_name, tier, units, home_slug, marketing_opt_in')
            .eq('id', uid)
            .maybeSingle(),
          supabase.from('admins').select('user_id').eq('user_id', uid).maybeSingle(),
        ]);
        setProfile(asProfile((row as Record<string, unknown> | null) ?? null));
        setIsAdmin(Boolean(adminRow));
      } catch {
        /* offline; keep whatever we had */
      }
    },
    [],
  );

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      const supabase = await client();
      if (!supabase || cancelled) return;

      const apply = (session: Session | null) => {
        if (cancelled) return;
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        setStatus(nextUser ? 'in' : 'out');
        if (!nextUser) {
          setProfile(null);
          setIsAdmin(false);
        } else {
          void loadProfile(supabase, nextUser.id);
        }
      };

      // Local read. No network, so this resolves offline.
      const { data } = await supabase.auth.getSession();
      apply(data.session ?? null);

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        // TOKEN_REFRESHED failing offline surfaces as a null session on some
        // SDK paths. Only an explicit sign-out clears the session; anything
        // else that arrives without one is treated as "still whoever we had".
        if (!session && event !== 'SIGNED_OUT') return;
        apply(session ?? null);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    })().catch(() => {
      // Could not even construct the client. Do not strand the reader at a
      // login screen for an infrastructure problem that is not theirs.
      if (!cancelled) setStatus('disabled');
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [configured, client, loadProfile]);

  const refreshProfile = useCallback(async () => {
    const supabase = await client();
    if (supabase && user) await loadProfile(supabase, user.id);
  }, [client, user, loadProfile]);

  const signIn = useCallback<AuthValue['signIn']>(
    async (email, password) => {
      const supabase = await client();
      if (!supabase) return { ok: false, message: 'Accounts are not available in this build.' };
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      return error ? { ok: false, message: humanise(error.message) } : { ok: true };
    },
    [client],
  );

  const signUp = useCallback<AuthValue['signUp']>(
    async (email, password, displayName) => {
      const supabase = await client();
      if (!supabase) return { ok: false, message: 'Accounts are not available in this build.' };
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: displayName ? { display_name: displayName.trim() } : undefined,
          emailRedirectTo: `${window.location.origin}/signin`,
        },
      });
      if (error) return { ok: false, message: humanise(error.message) };
      // Confirmation on: no session comes back and the account is inert until
      // the link is clicked. Confirmation off: a session arrives and the
      // onAuthStateChange listener above lets them straight in.
      if (!data.session) {
        return {
          ok: true,
          needsConfirmation: true,
          message: `Check ${email.trim()} for a confirmation link.`,
        };
      }
      return { ok: true };
    },
    [client],
  );

  const signOut = useCallback(async () => {
    const supabase = await client();
    await supabase?.auth.signOut();
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setStatus('out');
  }, [client]);

  const requestPasswordReset = useCallback<AuthValue['requestPasswordReset']>(
    async (email) => {
      const supabase = await client();
      if (!supabase) return { ok: false, message: 'Accounts are not available in this build.' };
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset`,
      });
      // Deliberately the same answer either way: a reset form that says "no
      // such account" is a way to find out who has one.
      return error && !/user not found/i.test(error.message)
        ? { ok: false, message: humanise(error.message) }
        : { ok: true, message: `If ${email.trim()} has an account, a reset link is on its way.` };
    },
    [client],
  );

  const updatePassword = useCallback<AuthValue['updatePassword']>(
    async (next) => {
      const supabase = await client();
      if (!supabase) return { ok: false, message: 'Accounts are not available in this build.' };
      const { error } = await supabase.auth.updateUser({ password: next });
      return error ? { ok: false, message: humanise(error.message) } : { ok: true };
    },
    [client],
  );

  const updateProfile = useCallback<AuthValue['updateProfile']>(
    async (patch) => {
      const supabase = await client();
      if (!supabase || !user) return { ok: false, message: 'Not signed in.' };
      const { error } = await supabase.from('profiles').update(patch).eq('id', user.id);
      if (error) return { ok: false, message: humanise(error.message) };
      await loadProfile(supabase, user.id);
      return { ok: true };
    },
    [client, user, loadProfile],
  );

  const deleteAccount = useCallback<AuthValue['deleteAccount']>(
    async (confirmEmail) => {
      const supabase = await client();
      if (!supabase) return { ok: false, message: 'Accounts are not available in this build.' };
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return { ok: false, message: 'Sign in again before deleting your account.' };
      try {
        const { error } = await supabase.functions.invoke('delete-account', {
          body: { confirm_email: confirmEmail },
        });
        if (error) return { ok: false, message: humanise(error.message) };
      } catch (e) {
        return { ok: false, message: humanise(e instanceof Error ? e.message : 'Unknown error') };
      }
      await signOut();
      return { ok: true };
    },
    [client, signOut],
  );

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user,
      profile,
      isAdmin,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      updateProfile,
      deleteAccount,
      refreshProfile,
    }),
    [
      status, user, profile, isAdmin, signIn, signUp, signOut,
      requestPasswordReset, updatePassword, updateProfile, deleteAccount, refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** The tier a signed-in reader is on. Free until a profile says otherwise. */
export function useTierFromAccount(): Tier {
  const { profile } = useAuth();
  return profile?.tier ?? 'free';
}
