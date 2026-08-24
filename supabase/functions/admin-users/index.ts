// =============================================================================
// Shorebound `admin-users` Edge Function — the operations that need auth.users.
// =============================================================================
//
// Reading accounts, granting premium and renaming somebody are all doable from
// the console with the anon key, because they are security-definer functions
// that check is_admin() themselves (migration 20260823140000).
//
// These three are not, because they change an IDENTITY:
//
//   reset_password  — send the account a password-reset link
//   set_email       — change the address the account signs in with
//   delete_user     — remove the account
//
// Each requires the service role, and the service role must never be in a
// bundle. So they live here, behind two checks that run before anything else:
// the caller must present a valid token, and that token's user must have a row
// in public.admins. The second check is done with the CALLER's key, not the
// service key, so the RLS policy on `admins` does the deciding.
//
// The subject is taken from the request body, which is correct here and wrong
// in `delete-account` — the difference is that this endpoint is FOR acting on
// other people, and is gated on being an admin. That gate is the only thing
// standing between this body parameter and an account-takeover primitive, so
// it is checked first, checked server-side, and never inferred from the client.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  // supabase-js attaches `apikey` and `x-client-info` to every invoke, and
  // newer clients add `x-supabase-api-version`. A preflight that does not
  // name them is rejected by the browser BEFORE the request is sent, which
  // surfaces as "Failed to send a request to the Edge Function" — a message
  // that points at the function when the function was never reached.
  // identify-fish had this right; these two were written without checking it.
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'Function is not configured' }, 500);

  const authorization = req.headers.get('Authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return json({ error: 'Not signed in' }, 401);

  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userResult } = await caller.auth.getUser();
  const actor = userResult?.user ?? null;
  if (!actor) return json({ error: 'Not signed in' }, 401);

  // Read through the caller's own key so the RLS policy on `admins` is what
  // answers. A non-admin sees no rows and is refused here.
  const { data: adminRow } = await caller
    .from('admins')
    .select('user_id')
    .eq('user_id', actor.id)
    .maybeSingle();
  if (!adminRow) return json({ error: 'Not an owner account' }, 403);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) ?? {};
  } catch {
    return json({ error: 'Expected a JSON body' }, 400);
  }

  const action = typeof body.action === 'string' ? body.action : '';
  const subject = typeof body.user_id === 'string' ? body.user_id : '';
  if (!subject) return json({ error: 'user_id is required' }, 400);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const audit = (detail: Record<string, unknown>) =>
    admin.from('account_audit').insert({
      actor: actor.id,
      subject,
      action,
      detail,
    });

  if (action === 'reset_password') {
    // A link, not a new password. Nobody — including the owner — should ever
    // be in a position to know somebody else's password, and a console that
    // sets one would put them there.
    const { data: target } = await admin.auth.admin.getUserById(subject);
    const email = target?.user?.email;
    if (!email) return json({ error: 'That account has no email address' }, 400);

    const redirectTo = typeof body.redirect_to === 'string' ? body.redirect_to : undefined;
    const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return json({ error: error.message }, 500);
    await audit({ email });
    return json({ ok: true, message: `Reset link sent to ${email}.` });
  }

  if (action === 'confirm_user') {
    // Approve an account by hand, instead of waiting on the confirmation
    // email. Email stays the default path — this is the escape hatch for when
    // it fails, which it does: the address bounces, the link lands in spam, the
    // send quota is exhausted, or the person signed up at a shop counter with
    // somebody standing next to them.
    //
    // What this asserts is "the owner vouches for this person", which is a
    // different claim from "this address was proven reachable". Both end with
    // email_confirmed_at set, so the audit row is the only thing that
    // distinguishes them afterwards — which is why one is written.
    if (subject === actor.id) {
      // You are signed in, so you are already confirmed. Refusing is about the
      // shape of the endpoint, not this call: no action here should accept the
      // caller as its own subject.
      return json({ error: 'You cannot approve your own account.' }, 400);
    }
    const { data: target } = await admin.auth.admin.getUserById(subject);
    if (!target?.user) return json({ error: 'No such account' }, 404);
    if (target.user.email_confirmed_at) {
      return json({ ok: true, message: 'That account was already confirmed.' });
    }
    const { error } = await admin.auth.admin.updateUserById(subject, { email_confirm: true });
    if (error) return json({ error: error.message }, 500);
    await audit({ email: target.user.email, by: 'owner approval' });
    return json({ ok: true, message: `${target.user.email} approved — they can sign in now.` });
  }

  if (action === 'set_email') {
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email || !email.includes('@')) return json({ error: 'A valid email is required' }, 400);
    const { error } = await admin.auth.admin.updateUserById(subject, {
      email,
      email_confirm: true,
    });
    if (error) return json({ error: error.message }, 500);
    await audit({ email });
    return json({ ok: true, message: `Address changed to ${email}.` });
  }

  if (action === 'delete_user') {
    // An owner cannot delete themselves from here. Removing the last admin by
    // accident locks everybody out of the console permanently.
    if (subject === actor.id) {
      return json({ error: 'Use your own settings page to delete your own account.' }, 400);
    }
    const { error } = await admin.auth.admin.deleteUser(subject);
    if (error) return json({ error: error.message }, 500);
    await audit({});
    return json({ ok: true, message: 'Account deleted.' });
  }

  return json({ error: `Unknown action: ${action || '(none)'}` }, 400);
});
