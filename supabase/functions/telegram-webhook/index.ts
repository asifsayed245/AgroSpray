// AgroSpray farmer-facing Telegram bot — MVP webhook handler.
// Receives Telegram updates, runs a state-machine conversation, books spray jobs.
//
// Conversation states:
//   idle → awaiting_consent → awaiting_crop → awaiting_area → awaiting_date
//        → awaiting_village → awaiting_spray_type → awaiting_confirm → (commits) → idle

// @ts-expect-error  Deno-only import resolved at deploy time
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// @ts-expect-error  Deno is the runtime
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-expect-error
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SEED_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ────────────────────────────────────────────────────────────────
// Strings (English only for MVP — expand to hi/mr later)
// ────────────────────────────────────────────────────────────────
const T = {
  welcome: (name: string) =>
    `🌾 Hi ${name}! I'm the AgroSpray booking bot for *Sahyadri Agri Drones*.\n\nI can book a drone spray for your field in under a minute.`,
  consent:
    "Before we start: we'll store your name, phone, location and booking details to fulfil the spray and meet DGCA + DPDP rules. Data stays in India.\n\nTap *Accept* to continue.",
  consentAccepted: "Great, thanks! Let's start.",
  askName: "What's your *full name*? (so our pilot knows who to call)",
  askPhone:
    "What's the *phone number* we should reach you on?\n(10-digit Indian mobile, e.g. `9876543210`)",
  hiAgain: (name: string) =>
    `Welcome back, ${name}! 👋 Let's get your next spray booked.`,
  askCrop: "What's the crop?",
  askArea: "How many *acres* are we spraying?\n(Just type the number — e.g. `12`)",
  askDate: "Which day works for you?",
  askVillage: "Which village is the field in?",
  askSprayType: "What kind of spray?",
  askConfirm: (d: Draft) =>
    `*Please confirm:*\n` +
    `• Name: ${d.name ?? "—"}\n` +
    `• Phone: ${d.phone ?? "—"}\n` +
    `• Crop: ${d.crop}\n` +
    `• Area: ${d.area_acres} acres\n` +
    `• Date: ${d.scheduled_date}\n` +
    `• Village: ${d.village}\n` +
    `• Spray: ${d.spray_type}\n\n` +
    `Tap *Confirm* to book.`,
  confirmed: (n: string, total: string) =>
    `✅ *Booking confirmed!*\nJob: \`${n}\`\nEstimated total: ₹${total}\n\nOur ops team will assign a crew and reach out before the visit.`,
  wishlisted: (n: string) =>
    `⏳ All slots are full for that day. You're on the wishlist (job \`${n}\`). We'll message you if a slot opens up.`,
  compFail: (n: string) =>
    `⚠️ Booking *${n}* needs a manual review — usually a compliance check (pesticide / pilot RPC / drone). Our team will call you shortly.`,
  fallback:
    "Sorry, I didn't catch that. Send /start to begin a new booking, or /cancel to abort the current one.",
  cancelled: "Cancelled. Send /start anytime to book a new spray.",
  notNumber: "Please send a number — e.g. `12` for 12 acres.",
  notValidName: "Please send your full name (at least 2 letters).",
  notValidPhone: "Please send a valid 10-digit Indian mobile number — e.g. `9876543210`.",
};

type Draft = {
  name?: string;
  phone?: string;
  crop?: string;
  area_acres?: number;
  scheduled_date?: string;
  village?: string;
  spray_type?: string;
};

const NAME_RE = /[A-Za-zऀ-ॿ]{2,}/;
const PHONE_RE = /^[6-9]\d{9}$/;
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  // accept 10-digit Indian, 11-digit (starts with 0), 12-digit (starts with 91)
  if (PHONE_RE.test(digits)) return digits;
  if (digits.length === 11 && digits.startsWith("0") && PHONE_RE.test(digits.slice(1))) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91") && PHONE_RE.test(digits.slice(2))) return digits.slice(2);
  return null;
}

const CROPS = ["cotton", "wheat", "soybean", "paddy", "maize", "sugarcane", "chilli", "tomato"];
const SPRAY_TYPES = ["insecticide", "herbicide", "fungicide", "nutrient"];

// ────────────────────────────────────────────────────────────────
// Telegram helpers
// ────────────────────────────────────────────────────────────────
async function tg(method: string, token: string, body: Record<string, unknown>) {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    console.error(`telegram ${method} failed`, r.status, text);
    return null;
  }
  return r.json();
}

function inlineKeyboard(rows: { text: string; data: string }[][]) {
  return {
    inline_keyboard: rows.map((row) =>
      row.map((b) => ({ text: b.text, callback_data: b.data })),
    ),
  };
}

function buttonGrid(items: string[], prefix: string, perRow = 2) {
  const rows: { text: string; data: string }[][] = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(
      items.slice(i, i + perRow).map((v) => ({
        text: v[0].toUpperCase() + v.slice(1),
        data: `${prefix}:${v}`,
      })),
    );
  }
  return inlineKeyboard(rows);
}

function dateButtons() {
  const out: { text: string; data: string }[][] = [];
  const today = new Date();
  for (let day = 0; day < 7; day++) {
    const d = new Date(today.getTime() + day * 86400e3);
    const iso = d.toISOString().slice(0, 10);
    const label =
      day === 0 ? "Today" : day === 1 ? "Tomorrow" : d.toDateString().slice(0, 10);
    out.push([{ text: label, data: `date:${iso}` }]);
  }
  return inlineKeyboard(out);
}

// ────────────────────────────────────────────────────────────────
// DB helpers (service role, RLS bypassed)
// ────────────────────────────────────────────────────────────────
async function getTenantToken(): Promise<{
  id: string;
  name: string;
  token: string | null;
}> {
  const { data } = await supa
    .from("tenants")
    .select("id, name, telegram_bot_token")
    .eq("id", SEED_TENANT_ID)
    .single();
  return {
    id: data?.id ?? SEED_TENANT_ID,
    name: data?.name ?? "AgroSpray",
    token: data?.telegram_bot_token ?? null,
  };
}

async function logMessage(row: {
  tenant_id: string;
  direction: "in" | "out";
  chat_id: string;
  user_id?: string;
  username?: string;
  message_id?: string;
  body?: string;
  payload?: unknown;
  state?: string;
  error?: string;
}) {
  await supa.from("telegram_messages").insert(row);
}

async function getOrCreateSession(tenantId: string, chatId: string, userId: string | null, username: string | null) {
  const { data: existing } = await supa
    .from("farmer_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  if (existing) return existing;
  const { data: created } = await supa
    .from("farmer_sessions")
    .insert({
      tenant_id: tenantId,
      telegram_chat_id: chatId,
      telegram_user_id: userId,
      username,
      state: "idle",
      draft: {},
    })
    .select("*")
    .single();
  return created!;
}

async function setSession(id: string, patch: Record<string, unknown>) {
  await supa
    .from("farmer_sessions")
    .update({ ...patch, last_activity_at: new Date().toISOString() })
    .eq("id", id);
}

// ────────────────────────────────────────────────────────────────
// Send + log
// ────────────────────────────────────────────────────────────────
async function reply(token: string, tenantId: string, chatId: string, text: string, opts?: { reply_markup?: unknown }) {
  const result = await tg("sendMessage", token, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    ...(opts ?? {}),
  });
  await logMessage({
    tenant_id: tenantId,
    direction: "out",
    chat_id: chatId,
    body: text,
    payload: opts ?? {},
  });
  return result;
}

// ────────────────────────────────────────────────────────────────
// State machine
// ────────────────────────────────────────────────────────────────
async function handleInput(
  token: string,
  tenantId: string,
  chatId: string,
  text: string | null,
  callbackData: string | null,
  callbackQueryId: string | null,
  userId: string | null,
  username: string | null,
  firstName: string,
) {
  const session = await getOrCreateSession(tenantId, chatId, userId, username);

  // Always acknowledge a callback so the spinner stops
  if (callbackQueryId) {
    await tg("answerCallbackQuery", token, { callback_query_id: callbackQueryId });
  }

  const input = (callbackData ?? text ?? "").trim();
  const lower = input.toLowerCase();

  // Universal commands
  if (lower === "/cancel") {
    await setSession(session.id, { state: "idle", draft: {} });
    return reply(token, tenantId, chatId, T.cancelled);
  }
  if (lower === "/start") {
    let knownName: string | null = null;
    if (session.farmer_id) {
      const { data: f } = await supa
        .from("farmers")
        .select("name")
        .eq("id", session.farmer_id)
        .maybeSingle();
      if (f?.name && f.name !== "Telegram user") knownName = f.name as string;
    }

    if (!session.consent_at) {
      await setSession(session.id, { state: "awaiting_consent", draft: {} });
      await reply(token, tenantId, chatId, T.welcome(firstName));
      return reply(token, tenantId, chatId, T.consent, {
        reply_markup: inlineKeyboard([[{ text: "✅ Accept", data: "consent:accept" }]]),
      });
    }

    if (!knownName) {
      // Returning user but no usable name on file — ask again so the admin
      // sees a real name on the booking.
      await setSession(session.id, { state: "awaiting_name", draft: {} });
      await reply(token, tenantId, chatId, T.welcome(firstName));
      return reply(token, tenantId, chatId, T.askName);
    }

    await setSession(session.id, { state: "awaiting_crop", draft: { name: knownName } });
    await reply(token, tenantId, chatId, T.hiAgain(knownName));
    return reply(token, tenantId, chatId, T.askCrop, {
      reply_markup: buttonGrid(CROPS, "crop"),
    });
  }

  const draft: Draft = session.draft ?? {};

  switch (session.state) {
    case "awaiting_consent": {
      if (callbackData === "consent:accept" || lower === "accept") {
        await setSession(session.id, {
          state: "awaiting_name",
          consent_at: new Date().toISOString(),
        });
        await reply(token, tenantId, chatId, T.consentAccepted);
        return reply(token, tenantId, chatId, T.askName);
      }
      return reply(token, tenantId, chatId, T.consent, {
        reply_markup: inlineKeyboard([[{ text: "✅ Accept", data: "consent:accept" }]]),
      });
    }
    case "awaiting_name": {
      const candidate = (text ?? "").trim();
      if (!candidate || !NAME_RE.test(candidate)) {
        return reply(token, tenantId, chatId, T.notValidName);
      }
      await setSession(session.id, {
        state: "awaiting_phone",
        draft: { ...draft, name: candidate },
      });
      return reply(token, tenantId, chatId, T.askPhone);
    }
    case "awaiting_phone": {
      const phone = normalisePhone(text ?? "");
      if (!phone) {
        return reply(token, tenantId, chatId, T.notValidPhone);
      }
      await setSession(session.id, {
        state: "awaiting_crop",
        draft: { ...draft, phone },
      });
      return reply(token, tenantId, chatId, T.askCrop, {
        reply_markup: buttonGrid(CROPS, "crop"),
      });
    }
    case "awaiting_crop": {
      let crop: string | null = null;
      if (callbackData?.startsWith("crop:")) crop = callbackData.slice(5);
      else if (CROPS.includes(lower)) crop = lower;
      if (!crop) {
        return reply(token, tenantId, chatId, T.askCrop, {
          reply_markup: buttonGrid(CROPS, "crop"),
        });
      }
      await setSession(session.id, {
        state: "awaiting_area",
        draft: { ...draft, crop },
      });
      return reply(token, tenantId, chatId, T.askArea);
    }
    case "awaiting_area": {
      const n = Number(text);
      if (!Number.isFinite(n) || n <= 0) {
        return reply(token, tenantId, chatId, T.notNumber);
      }
      await setSession(session.id, {
        state: "awaiting_date",
        draft: { ...draft, area_acres: n },
      });
      return reply(token, tenantId, chatId, T.askDate, {
        reply_markup: dateButtons(),
      });
    }
    case "awaiting_date": {
      let iso: string | null = null;
      if (callbackData?.startsWith("date:")) iso = callbackData.slice(5);
      else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) iso = input;
      if (!iso) {
        return reply(token, tenantId, chatId, T.askDate, {
          reply_markup: dateButtons(),
        });
      }
      await setSession(session.id, {
        state: "awaiting_village",
        draft: { ...draft, scheduled_date: iso },
      });
      return reply(token, tenantId, chatId, T.askVillage);
    }
    case "awaiting_village": {
      if (!text || text.length < 2) {
        return reply(token, tenantId, chatId, T.askVillage);
      }
      await setSession(session.id, {
        state: "awaiting_spray_type",
        draft: { ...draft, village: text },
      });
      return reply(token, tenantId, chatId, T.askSprayType, {
        reply_markup: buttonGrid(SPRAY_TYPES, "spray"),
      });
    }
    case "awaiting_spray_type": {
      let spray: string | null = null;
      if (callbackData?.startsWith("spray:")) spray = callbackData.slice(6);
      else if (SPRAY_TYPES.includes(lower)) spray = lower;
      if (!spray) {
        return reply(token, tenantId, chatId, T.askSprayType, {
          reply_markup: buttonGrid(SPRAY_TYPES, "spray"),
        });
      }
      const nextDraft = { ...draft, spray_type: spray };
      await setSession(session.id, {
        state: "awaiting_confirm",
        draft: nextDraft,
      });
      return reply(token, tenantId, chatId, T.askConfirm(nextDraft), {
        reply_markup: inlineKeyboard([
          [
            { text: "✅ Confirm", data: "confirm:yes" },
            { text: "❌ Cancel", data: "confirm:no" },
          ],
        ]),
      });
    }
    case "awaiting_confirm": {
      if (callbackData === "confirm:no" || lower === "cancel") {
        await setSession(session.id, { state: "idle", draft: {} });
        return reply(token, tenantId, chatId, T.cancelled);
      }
      if (callbackData === "confirm:yes" || lower === "confirm") {
        const { data, error } = await supa.rpc("tg_finalize_booking", {
          p_tenant_id: tenantId,
          p_telegram_chat_id: chatId,
        });
        if (error) {
          console.error("finalize error", error);
          return reply(
            token,
            tenantId,
            chatId,
            `❌ Couldn't book: ${error.message}. Send /start to try again.`,
          );
        }
        const r = data as {
          status: string;
          job_number?: string;
          total?: string;
        };
        if (r.status === "confirmed") {
          return reply(
            token,
            tenantId,
            chatId,
            T.confirmed(r.job_number ?? "AGR-?", r.total ?? "0"),
          );
        }
        if (r.status === "wishlisted") {
          return reply(token, tenantId, chatId, T.wishlisted(r.job_number ?? "AGR-?"));
        }
        return reply(token, tenantId, chatId, T.compFail(r.job_number ?? "AGR-?"));
      }
      return reply(token, tenantId, chatId, T.askConfirm(draft), {
        reply_markup: inlineKeyboard([
          [
            { text: "✅ Confirm", data: "confirm:yes" },
            { text: "❌ Cancel", data: "confirm:no" },
          ],
        ]),
      });
    }
    default:
      // idle / unknown → bounce to /start
      await setSession(session.id, { state: "awaiting_consent" });
      await reply(token, tenantId, chatId, T.welcome(firstName));
      return reply(token, tenantId, chatId, T.consent, {
        reply_markup: inlineKeyboard([[{ text: "✅ Accept", data: "consent:accept" }]]),
      });
  }
}

// ────────────────────────────────────────────────────────────────
// HTTP entry
// ────────────────────────────────────────────────────────────────
// @ts-expect-error  Deno global
Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return new Response("ok", { status: 200 });
  }
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  const update = await req.json().catch(() => null) as
    | {
        message?: {
          message_id: number;
          from: { id: number; username?: string; first_name?: string };
          chat: { id: number };
          text?: string;
        };
        callback_query?: {
          id: string;
          from: { id: number; username?: string; first_name?: string };
          message?: { chat: { id: number } };
          data?: string;
        };
      }
    | null;

  if (!update) return new Response("bad request", { status: 400 });

  const tenant = await getTenantToken();
  if (!tenant.token) {
    console.warn("no bot token configured for tenant", tenant.id);
    return new Response("no token", { status: 200 });
  }

  try {
    const msg = update.message;
    const cb = update.callback_query;

    let chatId: string | null = null;
    let userId: string | null = null;
    let username: string | null = null;
    let firstName = "there";
    let text: string | null = null;
    let callbackData: string | null = null;
    let callbackQueryId: string | null = null;
    let messageId: string | null = null;

    if (msg) {
      chatId = String(msg.chat.id);
      userId = String(msg.from.id);
      username = msg.from.username ?? null;
      firstName = msg.from.first_name ?? "there";
      text = msg.text ?? null;
      messageId = String(msg.message_id);
    } else if (cb) {
      chatId = cb.message?.chat ? String(cb.message.chat.id) : null;
      userId = String(cb.from.id);
      username = cb.from.username ?? null;
      firstName = cb.from.first_name ?? "there";
      callbackData = cb.data ?? null;
      callbackQueryId = cb.id;
    }

    if (!chatId) return new Response("no chat", { status: 200 });

    await logMessage({
      tenant_id: tenant.id,
      direction: "in",
      chat_id: chatId,
      user_id: userId ?? undefined,
      username: username ?? undefined,
      message_id: messageId ?? undefined,
      body: text ?? callbackData ?? "",
      payload: update,
    });

    await handleInput(
      tenant.token,
      tenant.id,
      chatId,
      text,
      callbackData,
      callbackQueryId,
      userId,
      username,
      firstName,
    );
  } catch (e) {
    console.error("handler error", e);
  }

  return new Response("ok", { status: 200 });
});
