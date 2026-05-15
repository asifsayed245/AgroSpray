// Admin-side reply delivery. Called by the PWA after `reply_to_farmer_query`
// returns. Loads the query + tenant's bot token using a service-role client,
// sends the reply to the farmer's Telegram chat, then flips the row to
// status='replied' via the mark_farmer_query_delivered RPC.

// @ts-expect-error  Deno import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// @ts-expect-error  Deno global
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-expect-error
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// @ts-expect-error
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-client-info, apikey",
  "access-control-allow-methods": "POST, OPTIONS",
};

// @ts-expect-error  Deno global
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return Response.json({ error: "missing auth" }, { status: 401, headers: cors });
  }

  const body = await req.json().catch(() => null) as { query_id?: string } | null;
  if (!body?.query_id) {
    return Response.json({ error: "query_id required" }, { status: 400, headers: cors });
  }

  // Caller's session — used to confirm the user has tenant access (RLS gates
  // the join to tenants/farmer_queries). If they can read the row, they're
  // allowed to send the reply.
  const supaUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: visible, error: visErr } = await supaUser
    .from("farmer_queries")
    .select("id, tenant_id")
    .eq("id", body.query_id)
    .maybeSingle();
  if (visErr || !visible) {
    return Response.json({ error: "query not found or no access" }, { status: 403, headers: cors });
  }

  // Service-role client for the bits the caller can't directly read
  // (tenants.telegram_bot_token is admin-only on the client) and for the
  // status-flip after a successful Telegram send.
  const supaAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: q } = await supaAdmin
    .from("farmer_queries")
    .select("id, tenant_id, telegram_chat_id, reply_text, status")
    .eq("id", body.query_id)
    .single();
  if (!q) {
    return Response.json({ error: "query missing after auth" }, { status: 404, headers: cors });
  }
  if (!q.reply_text) {
    return Response.json({ error: "no reply_text set — call reply_to_farmer_query first" }, { status: 400, headers: cors });
  }
  if (q.status === "replied") {
    return Response.json({ ok: true, already_replied: true }, { headers: cors });
  }

  const { data: tenant } = await supaAdmin
    .from("tenants")
    .select("name, telegram_bot_token")
    .eq("id", q.tenant_id)
    .single();
  if (!tenant?.telegram_bot_token) {
    return Response.json({ error: "tenant has no bot token" }, { status: 400, headers: cors });
  }

  const tgPayload = {
    chat_id: q.telegram_chat_id,
    text: `💬 *Reply from ${tenant.name ?? "AgroSpray"}:*\n\n${q.reply_text}`,
    parse_mode: "Markdown",
  };
  const tgRes = await fetch(
    `https://api.telegram.org/bot${tenant.telegram_bot_token}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tgPayload),
    },
  );
  const tgJson = await tgRes.json().catch(() => null);
  if (!tgRes.ok || !tgJson?.ok) {
    return Response.json(
      { error: "Telegram send failed", telegram: tgJson },
      { status: 502, headers: cors },
    );
  }

  // Log outbound + flip status
  await supaAdmin.from("telegram_messages").insert({
    tenant_id: q.tenant_id,
    direction: "out",
    chat_id: q.telegram_chat_id,
    body: tgPayload.text,
    payload: { query_id: q.id, reply: true },
  });
  await supaAdmin.rpc("mark_farmer_query_delivered", { p_query_id: q.id });

  return Response.json({ ok: true }, { headers: cors });
});
