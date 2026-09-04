// Supabase Edge Function — sends an Expo push notification to every
// device registered for a user (push_tokens can hold more than one row
// per user, e.g. phone + tablet).
//
// Not deployed from this session (no Supabase CLI auth here) — same
// treatment as the Python backend in backend/. To deploy:
//   supabase functions deploy send-push
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically
// by the Edge Functions runtime; no manual secret setup needed for those.
//
// Called from the client via supabase.functions.invoke('send-push', ...)
// — see lib/push.ts's sendPushTo(). Never call this with the anon key
// exposed to untrusted callers for arbitrary user_ids in a context where
// that matters more than it does here (a friends-demo social app) — for
// stricter abuse-resistance later, gate this behind a shared secret or
// move the calls to database webhooks instead of client-triggered calls.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SendPushBody {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let payload: SendPushBody;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { user_id, title, body, data } = payload;
  if (!user_id || !title || !body) {
    return new Response(JSON.stringify({ error: 'user_id, title, and body are required' }), { status: 400 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: tokens, error } = await supabase.from('push_tokens').select('token').eq('user_id', user_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0, reason: 'no registered devices' }), { status: 200 });
  }

  const messages = (tokens as { token: string }[]).map((t) => ({
    to: t.token,
    title,
    body,
    data: data ?? {},
    sound: 'default',
  }));

  const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate' },
    body: JSON.stringify(messages),
  });

  const expoResult: any = await expoRes.json().catch(() => null);

  return new Response(JSON.stringify({ sent: messages.length, expo: expoResult }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
