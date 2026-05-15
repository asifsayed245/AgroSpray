// Triggered by the admin PWA to (re-)register the Telegram webhook for the tenant's bot.
// Reads tenant's bot token via the caller's auth (RLS), then calls Telegram setWebhook.

// @ts-expect-error  Deno import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// @ts-expect-error  Deno global
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-expect-error
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/telegram-webhook`;

// @ts-expect-error  Deno.serve
Deno.serve(async (req: Request) => {
  const cors = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type, x-client-info, apikey",
    "access-control-allow-methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return Response.json({ error: "missing auth" }, { status: 401, headers: cors });
  }

  // Caller's session — RLS will scope reads to their tenant.
  const supa = createClient(SUPABASE_URL, ANON, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: tenant, error } = await supa
    .from("tenants")
    .select("id, telegram_bot_token")
    .limit(1)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 400, headers: cors });
  if (!tenant || !tenant.telegram_bot_token) {
    return Response.json({ error: "No bot token set on tenant" }, { status: 400, headers: cors });
  }

  const tgRes = await fetch(
    `https://api.telegram.org/bot${tenant.telegram_bot_token}/setWebhook`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: WEBHOOK_URL, drop_pending_updates: true }),
    },
  );
  const tgJson = await tgRes.json().catch(() => null);

  let info: unknown = null;
  try {
    const infoRes = await fetch(`https://api.telegram.org/bot${tenant.telegram_bot_token}/getWebhookInfo`);
    const infoJson = await infoRes.json();
    info = infoJson?.result ?? null;
  } catch (_) { /* non-fatal */ }

  return Response.json(
    { ok: tgRes.ok && tgJson?.ok === true, webhook_url: WEBHOOK_URL, telegram: tgJson, info },
    { status: tgRes.ok && tgJson?.ok ? 200 : 400, headers: cors },
  );
});
