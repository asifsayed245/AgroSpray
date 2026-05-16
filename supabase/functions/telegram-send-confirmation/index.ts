// telegram-send-confirmation — invoked by the admin PWA after a supplier
// presses "Confirm inquiry" on a bot-submitted job. Looks up the farmer's
// chat_id via the job, pulls the tenant's bot token, and pushes a
// localized "your spray is confirmed" message back to the farmer.

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

type Lang = "en" | "hi" | "mr";

function formatRange(dateStart: string, dateEnd: string | null, timeStart: string | null, timeEnd: string | null, lang: Lang) {
  // Date side
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(
      lang === "hi" ? "hi-IN" : lang === "mr" ? "mr-IN" : "en-IN",
      { day: "numeric", month: "short" },
    );
  const dateLabel = !dateEnd || dateEnd === dateStart ? fmt(dateStart) : `${fmt(dateStart)} – ${fmt(dateEnd)}`;
  if (!timeStart || !timeEnd) return dateLabel;
  return `${dateLabel}, ${timeStart.slice(0, 5)} – ${timeEnd.slice(0, 5)}`;
}

function buildMessage(args: {
  lang: Lang;
  tenantName: string;
  jobNumber: string;
  when: string;
  total: string | null;
}) {
  const { lang, tenantName, jobNumber, when, total } = args;
  if (lang === "hi") {
    return (
      `✅ *बुकिंग पक्की!*\n` +
      `जॉब: \`${jobNumber}\`\n` +
      `समय: *${when}*\n` +
      (total ? `अनुमानित कुल: ₹${total}\n\n` : "\n") +
      `${tenantName} की टीम विज़िट से पहले आपको कॉल करेगी।`
    );
  }
  if (lang === "mr") {
    return (
      `✅ *बुकिंग पक्की!*\n` +
      `जॉब: \`${jobNumber}\`\n` +
      `वेळ: *${when}*\n` +
      (total ? `अंदाजे एकूण: ₹${total}\n\n` : "\n") +
      `${tenantName} ची टीम भेटीपूर्वी तुम्हाला कॉल करेल.`
    );
  }
  return (
    `✅ *Booking confirmed!*\n` +
    `Job: \`${jobNumber}\`\n` +
    `When: *${when}*\n` +
    (total ? `Estimated total: ₹${total}\n\n` : "\n") +
    `Our crew will call you 15 min before they arrive.`
  );
}

// @ts-expect-error  Deno.serve
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return Response.json({ error: "missing auth" }, { status: 401, headers: cors });
  }
  const body = (await req.json().catch(() => null)) as { job_id?: string } | null;
  if (!body?.job_id) {
    return Response.json({ error: "job_id required" }, { status: 400, headers: cors });
  }

  // RLS-scoped check — caller must be able to read the job
  const supaUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: visible } = await supaUser.from("jobs").select("id, tenant_id").eq("id", body.job_id).maybeSingle();
  if (!visible) {
    return Response.json({ error: "job not found or no access" }, { status: 403, headers: cors });
  }

  const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: job } = await supa
    .from("jobs")
    .select(
      "id, tenant_id, number, state, scheduled_date, scheduled_date_end, scheduled_time_start, scheduled_time_end, farmer_id, pricing_snapshot",
    )
    .eq("id", body.job_id)
    .single();
  if (!job) return Response.json({ error: "job missing" }, { status: 404, headers: cors });

  const { data: tenant } = await supa
    .from("tenants")
    .select("name, telegram_bot_token")
    .eq("id", job.tenant_id)
    .single();
  if (!tenant?.telegram_bot_token) {
    return Response.json({ error: "tenant has no bot token" }, { status: 400, headers: cors });
  }

  // Find the farmer + the chat_id they last messaged from
  const { data: farmer } = await supa
    .from("farmers")
    .select("telegram_id, default_language")
    .eq("id", job.farmer_id)
    .maybeSingle();
  let chatId: string | null = null;
  let lang: Lang = "en";
  if (farmer?.default_language && ["en", "hi", "mr"].includes(farmer.default_language)) {
    lang = farmer.default_language as Lang;
  }
  if (farmer?.telegram_id) {
    const { data: session } = await supa
      .from("farmer_sessions")
      .select("telegram_chat_id, language")
      .eq("telegram_user_id", farmer.telegram_id)
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    chatId = session?.telegram_chat_id ?? null;
    if (session?.language && ["en", "hi", "mr"].includes(session.language)) {
      lang = session.language as Lang;
    }
  }
  if (!chatId) {
    return Response.json({ ok: false, reason: "farmer has no telegram chat on file" }, { headers: cors });
  }

  const when = formatRange(
    job.scheduled_date,
    job.scheduled_date_end,
    job.scheduled_time_start,
    job.scheduled_time_end,
    lang,
  );
  const total = (job.pricing_snapshot as { total?: number } | null)?.total ?? null;
  const text = buildMessage({
    lang,
    tenantName: tenant.name ?? "AgroSpray",
    jobNumber: job.number,
    when,
    total: total != null ? String(total) : null,
  });

  const tgRes = await fetch(`https://api.telegram.org/bot${tenant.telegram_bot_token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
  const tgJson = await tgRes.json().catch(() => null);

  await supa.from("telegram_messages").insert({
    tenant_id: job.tenant_id,
    direction: "out",
    chat_id: chatId,
    body: text,
    payload: { job_id: job.id, kind: "inquiry_confirmation" },
    error: tgRes.ok && tgJson?.ok ? null : `telegram ${tgRes.status}: ${JSON.stringify(tgJson)}`,
  });

  if (!tgRes.ok || !tgJson?.ok) {
    return Response.json({ ok: false, telegram: tgJson }, { status: 502, headers: cors });
  }
  return Response.json({ ok: true, chat_id: chatId, lang }, { headers: cors });
});
