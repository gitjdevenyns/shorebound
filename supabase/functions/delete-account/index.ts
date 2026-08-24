// =============================================================================
// Shorebound `delete-account` Edge Function — a person removes their account.
// =============================================================================
//
// This exists because deletion needs the service role and the service role must
// never be in the bundle. The function does exactly one thing: it verifies the
// caller's own access token, then deletes THAT user. It takes no user id from
// the request body, so there is no shape of request that deletes somebody else.
//
// App Store review requires this. Guideline 5.1.1(v): an app that lets a person
// create an account must let them delete it from inside the app — a support
// email is not accepted. Shipping the sign-up without this would fail review.
//
// Deleting the auth.users row cascades to public.profiles via its FK.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
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

  // Resolve the caller from their own token. This is the only place the
  // identity comes from — never from the request body.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userError } = await caller.auth.getUser();
  const user = userResult?.user ?? null;
  if (userError || !user) return json({ error: 'Not signed in' }, 401);

  // A second factor for an irreversible action: the client sends back the
  // address it is showing on screen, and it has to match the token's. This
  // catches a stale tab acting on an account the person has since switched off.
  let confirmEmail: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.confirm_email === 'string') confirmEmail = body.confirm_email;
  } catch {
    confirmEmail = null;
  }
  if (
    !confirmEmail ||
    confirmEmail.trim().toLowerCase() !== (user.email ?? '').trim().toLowerCase()
  ) {
    return json({ error: 'Type your email address exactly to confirm.' }, 400);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: error.message }, 500);

  return json({ deleted: true });
});
