// AgroSpray farmer-facing Telegram bot — multilingual (en / hi / mr).
//
// Conversation states:
//   idle → awaiting_language → awaiting_consent → awaiting_name → awaiting_phone
//        → awaiting_crop → awaiting_area → awaiting_date → awaiting_village
//        → awaiting_spray_type → awaiting_confirm → (commits) → idle

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

type Lang = "en" | "hi" | "mr";
const LANGS: Lang[] = ["en", "hi", "mr"];
const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  hi: "हिन्दी",
  mr: "मराठी",
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

// ────────────────────────────────────────────────────────────────
// String tables — one per language
// ────────────────────────────────────────────────────────────────
type Strings = {
  askLanguage: string;
  welcome: (name: string) => string;
  consent: string;
  consentAccepted: string;
  hiAgain: (name: string) => string;
  askName: string;
  askPhone: string;
  askCrop: string;
  askArea: string;
  askDate: string;
  askVillage: string;
  askSprayType: string;
  askConfirm: (d: Draft) => string;
  inquiryReceived: (n: string) => string;
  confirmed: (n: string, total: string) => string;
  wishlisted: (n: string) => string;
  compFail: (n: string) => string;
  cancelled: string;
  notNumber: string;
  notValidName: string;
  notValidPhone: string;
  queryReceived: string;
  queryReceivedIdle: string;
  acceptBtn: string;
  confirmBtn: string;
  cancelBtn: string;
  todayLabel: string;
  tomorrowLabel: string;
  fieldName: string;
  fieldPhone: string;
  fieldCrop: string;
  fieldArea: string;
  fieldDate: string;
  fieldVillage: string;
  fieldSpray: string;
  acres: string;
};

const STRINGS: Record<Lang, Strings> = {
  en: {
    askLanguage: "Which language would you like to use?\nकौन सी भाषा? / कोणती भाषा?",
    welcome: (n) =>
      `🌾 Hi ${n}! I'm the AgroSpray booking bot for *Sahyadri Agri Drones*.\n\nI can book a drone spray for your field in under a minute.`,
    consent:
      "Before we start: we'll store your name, phone, location and booking details to fulfil the spray and meet DGCA + DPDP rules. Data stays in India.\n\nTap *Accept* to continue.",
    consentAccepted: "Great, thanks! Let's start.",
    hiAgain: (n) => `Welcome back, ${n}! 👋 Let's get your next spray booked.`,
    askName: "What's your *full name*? (so our pilot knows who to call)",
    askPhone:
      "What's the *phone number* we should reach you on?\n(10-digit Indian mobile, e.g. `9876543210`)",
    askCrop: "What's the crop?",
    askArea: "How many *acres* are we spraying?\n(Just type the number — e.g. `12`)",
    askDate: "Which day works for you?",
    askVillage: "Which village is the field in?",
    askSprayType: "What kind of spray?",
    askConfirm: (d) =>
      `*Please confirm:*\n` +
      `• Name: ${d.name ?? "—"}\n` +
      `• Phone: ${d.phone ?? "—"}\n` +
      `• Crop: ${d.crop}\n` +
      `• Area: ${d.area_acres} acres\n` +
      `• Date: ${d.scheduled_date}\n` +
      `• Village: ${d.village}\n` +
      `• Spray: ${d.spray_type}\n\nTap *Confirm* to book.`,
    inquiryReceived: (n) =>
      `📋 *Got it!* Your booking is in.\nReference: \`${n}\`\n\nOur team will check time feasibility and confirm a slot within a few hours. You'll get a message here once the time is locked in.`,
    confirmed: (n, total) =>
      `✅ *Booking confirmed!*\nJob: \`${n}\`\nEstimated total: ₹${total}\n\nOur ops team will assign a crew and reach out before the visit.`,
    wishlisted: (n) =>
      `⏳ All slots are full for that day. You're on the wishlist (job \`${n}\`). We'll message you if a slot opens up.`,
    compFail: (n) =>
      `⚠️ Booking *${n}* needs a manual review — usually a compliance check (pesticide / pilot RPC / drone). Our team will call you shortly.`,
    cancelled: "Cancelled. Send /start anytime to book a new spray.",
    notNumber: "Please send a number — e.g. `12` for 12 acres.",
    notValidName: "Please send your full name (at least 2 letters).",
    notValidPhone: "Please send a valid 10-digit Indian mobile number — e.g. `9876543210`.",
    queryReceived: "Got it 👍 — we've sent your question to the team. Meanwhile, let's continue:",
    queryReceivedIdle: "Got it 👍 — we've sent your question to the team. They'll reply here soon.\n\nSend /start to book a new spray any time.",
    acceptBtn: "✅ Accept",
    confirmBtn: "✅ Confirm",
    cancelBtn: "❌ Cancel",
    todayLabel: "Today",
    tomorrowLabel: "Tomorrow",
    fieldName: "Name",
    fieldPhone: "Phone",
    fieldCrop: "Crop",
    fieldArea: "Area",
    fieldDate: "Date",
    fieldVillage: "Village",
    fieldSpray: "Spray",
    acres: "acres",
  },
  hi: {
    askLanguage: "आप कौन सी भाषा में बात करना चाहेंगे?",
    welcome: (n) =>
      `🌾 नमस्ते ${n}! मैं *सह्याद्री एग्री ड्रोन्स* का AgroSpray बुकिंग बॉट हूँ।\n\nमिनटों में अपने खेत के लिए ड्रोन स्प्रे बुक करें।`,
    consent:
      "शुरू करने से पहले: हम आपका नाम, फोन, स्थान और बुकिंग की जानकारी DGCA और DPDP नियमों के अनुसार सुरक्षित रखेंगे। डेटा भारत में ही रहेगा।\n\nजारी रखने के लिए *स्वीकार करें* दबाएँ।",
    consentAccepted: "बहुत अच्छा, शुक्रिया! शुरू करते हैं।",
    hiAgain: (n) => `वापसी पर स्वागत है, ${n}! 👋 अपनी अगली स्प्रे बुक करें।`,
    askName: "आपका *पूरा नाम* क्या है? (ताकि हमारा पायलट आपसे संपर्क कर सके)",
    askPhone:
      "हम आपसे किस *फोन नंबर* पर संपर्क करें?\n(10 अंकों का भारतीय मोबाइल, जैसे `9876543210`)",
    askCrop: "कौन सी फसल है?",
    askArea: "कितने *एकड़* में स्प्रे करना है?\n(सिर्फ संख्या लिखें — जैसे `12`)",
    askDate: "कौन सा दिन ठीक रहेगा?",
    askVillage: "खेत किस गाँव में है?",
    askSprayType: "कौन सा स्प्रे करना है?",
    askConfirm: (d) =>
      `*कृपया पुष्टि करें:*\n` +
      `• नाम: ${d.name ?? "—"}\n` +
      `• फोन: ${d.phone ?? "—"}\n` +
      `• फसल: ${d.crop}\n` +
      `• क्षेत्र: ${d.area_acres} एकड़\n` +
      `• तारीख: ${d.scheduled_date}\n` +
      `• गाँव: ${d.village}\n` +
      `• स्प्रे: ${d.spray_type}\n\nबुक करने के लिए *पुष्टि करें* दबाएँ।`,
    inquiryReceived: (n) =>
      `📋 *मिल गया!* आपकी बुकिंग दर्ज हो गई है।\nरेफरेंस: \`${n}\`\n\nहमारी टीम समय की उपलब्धता देख कर कुछ ही घंटों में स्लॉट पक्का करेगी। समय फिक्स होते ही आपको यहाँ मैसेज मिलेगा।`,
    confirmed: (n, total) =>
      `✅ *बुकिंग पक्की!*\nजॉब: \`${n}\`\nअनुमानित कुल: ₹${total}\n\nहमारी ऑप्स टीम क्रू भेजेगी और विज़िट से पहले आपको कॉल करेगी।`,
    wishlisted: (n) =>
      `⏳ उस दिन सभी स्लॉट भरे हैं। आप वेटलिस्ट पर हैं (जॉब \`${n}\`)। स्लॉट खाली होते ही आपको बताएँगे।`,
    compFail: (n) =>
      `⚠️ बुकिंग *${n}* की मैनुअल समीक्षा करनी होगी — आमतौर पर कंप्लायंस की वजह से। हमारी टीम आपको जल्द कॉल करेगी।`,
    cancelled: "रद्द कर दिया। नई स्प्रे बुक करने के लिए /start भेजें।",
    notNumber: "कृपया एक संख्या भेजें — जैसे 12 एकड़ के लिए `12`।",
    notValidName: "कृपया अपना पूरा नाम भेजें (कम से कम 2 अक्षर)।",
    notValidPhone: "कृपया सही 10-अंकीय भारतीय मोबाइल नंबर भेजें — जैसे `9876543210`।",
    queryReceived: "मिल गया 👍 — हमने आपका सवाल टीम को भेज दिया है। तब तक हम आगे बढ़ते हैं:",
    queryReceivedIdle: "मिल गया 👍 — हमने आपका सवाल टीम को भेज दिया है। टीम जल्द ही जवाब देगी।\n\nनई स्प्रे बुक करने के लिए /start भेजें।",
    acceptBtn: "✅ स्वीकार करें",
    confirmBtn: "✅ पुष्टि करें",
    cancelBtn: "❌ रद्द करें",
    todayLabel: "आज",
    tomorrowLabel: "कल",
    fieldName: "नाम",
    fieldPhone: "फोन",
    fieldCrop: "फसल",
    fieldArea: "क्षेत्र",
    fieldDate: "तारीख",
    fieldVillage: "गाँव",
    fieldSpray: "स्प्रे",
    acres: "एकड़",
  },
  mr: {
    askLanguage: "तुम्हाला कोणत्या भाषेत बोलायचं आहे?",
    welcome: (n) =>
      `🌾 नमस्कार ${n}! मी *सह्याद्री अ‍ॅग्री ड्रोन्स*चा AgroSpray बुकिंग बॉट आहे.\n\nएक मिनिटात तुमच्या शेतासाठी ड्रोन फवारणी बुक करा.`,
    consent:
      "सुरू करण्यापूर्वी: आम्ही तुमचं नाव, फोन, स्थान आणि बुकिंगची माहिती DGCA + DPDP नियमांनुसार सुरक्षित ठेवू. डेटा भारतातच राहील.\n\nपुढे जाण्यासाठी *मान्य* दाबा.",
    consentAccepted: "धन्यवाद! चला सुरू करूया.",
    hiAgain: (n) => `पुन्हा स्वागत, ${n}! 👋 तुमची पुढची फवारणी बुक करूया.`,
    askName: "तुमचं *पूर्ण नाव* काय आहे? (आमचा पायलट संपर्क करण्यासाठी)",
    askPhone:
      "तुमच्याशी कोणत्या *फोन नंबर*वर संपर्क साधावा?\n(10-अंकी भारतीय मोबाइल, जसे `9876543210`)",
    askCrop: "कोणतं पीक आहे?",
    askArea: "किती *एकर* मध्ये फवारणी करायची?\n(फक्त संख्या लिहा — जसे `12`)",
    askDate: "कोणता दिवस सोयीचा?",
    askVillage: "शेत कोणत्या गावात आहे?",
    askSprayType: "कोणती फवारणी?",
    askConfirm: (d) =>
      `*कृपया पुष्टी करा:*\n` +
      `• नाव: ${d.name ?? "—"}\n` +
      `• फोन: ${d.phone ?? "—"}\n` +
      `• पीक: ${d.crop}\n` +
      `• क्षेत्र: ${d.area_acres} एकर\n` +
      `• तारीख: ${d.scheduled_date}\n` +
      `• गाव: ${d.village}\n` +
      `• फवारणी: ${d.spray_type}\n\nबुक करण्यासाठी *पुष्टी* दाबा.`,
    inquiryReceived: (n) =>
      `📋 *मिळालं!* तुमची बुकिंग नोंदवली आहे.\nरेफरन्स: \`${n}\`\n\nआमची टीम वेळ तपासून काही तासांत स्लॉट पक्का करेल. वेळ ठरताच तुम्हाला इथे संदेश मिळेल.`,
    confirmed: (n, total) =>
      `✅ *बुकिंग पक्की!*\nजॉब: \`${n}\`\nअंदाजे एकूण: ₹${total}\n\nआमची ऑप्स टीम क्रू पाठवेल आणि भेटीपूर्वी तुम्हाला कॉल करेल.`,
    wishlisted: (n) =>
      `⏳ त्या दिवशी सर्व स्लॉट्स भरलेले आहेत. तुम्ही वेटलिस्टवर आहात (जॉब \`${n}\`). स्लॉट रिकामा होताच आम्ही कळवू.`,
    compFail: (n) =>
      `⚠️ बुकिंग *${n}* ची मॅन्युअल तपासणी करावी लागेल — सहसा कंप्लायन्ससाठी. आमची टीम तुम्हाला लवकरच कॉल करेल.`,
    cancelled: "रद्द. नवीन फवारणी बुक करण्यासाठी /start पाठवा.",
    notNumber: "कृपया संख्या पाठवा — जसे 12 एकरसाठी `12`.",
    notValidName: "कृपया तुमचं पूर्ण नाव पाठवा (किमान 2 अक्षरे).",
    notValidPhone: "कृपया योग्य 10-अंकी भारतीय मोबाइल नंबर पाठवा — जसे `9876543210`.",
    queryReceived: "मिळालं 👍 — आम्ही तुमचा प्रश्न टीमकडे पाठवला आहे. तोपर्यंत पुढे चालू ठेवू:",
    queryReceivedIdle: "मिळालं 👍 — आम्ही तुमचा प्रश्न टीमकडे पाठवला आहे. टीम लवकरच उत्तर देईल.\n\nनवीन फवारणी बुक करण्यासाठी /start पाठवा.",
    acceptBtn: "✅ मान्य",
    confirmBtn: "✅ पुष्टी",
    cancelBtn: "❌ रद्द",
    todayLabel: "आज",
    tomorrowLabel: "उद्या",
    fieldName: "नाव",
    fieldPhone: "फोन",
    fieldCrop: "पीक",
    fieldArea: "क्षेत्र",
    fieldDate: "तारीख",
    fieldVillage: "गाव",
    fieldSpray: "फवारणी",
    acres: "एकर",
  },
};

const t = (lang: Lang | string | null | undefined): Strings => {
  const l = (lang && LANGS.includes(lang as Lang) ? (lang as Lang) : "en");
  return STRINGS[l];
};

// ────────────────────────────────────────────────────────────────
// Localized button labels for crops + spray types
// ────────────────────────────────────────────────────────────────
const CROPS: Array<{ id: string; en: string; hi: string; mr: string }> = [
  { id: "cotton",    en: "Cotton",    hi: "कपास",   mr: "कापूस" },
  { id: "wheat",     en: "Wheat",     hi: "गेहूं",   mr: "गहू" },
  { id: "soybean",   en: "Soybean",   hi: "सोयाबीन", mr: "सोयाबीन" },
  { id: "paddy",     en: "Paddy",     hi: "धान",    mr: "भात" },
  { id: "maize",     en: "Maize",     hi: "मक्का",  mr: "मका" },
  { id: "sugarcane", en: "Sugarcane", hi: "गन्ना",  mr: "ऊस" },
  { id: "chilli",    en: "Chilli",    hi: "मिर्च",  mr: "मिरची" },
  { id: "tomato",    en: "Tomato",    hi: "टमाटर",  mr: "टोमॅटो" },
];

const SPRAYS: Array<{ id: string; en: string; hi: string; mr: string }> = [
  { id: "insecticide", en: "Insecticide", hi: "कीटनाशक",       mr: "कीटकनाशक" },
  { id: "herbicide",   en: "Herbicide",   hi: "खरपतवारनाशक",  mr: "तणनाशक" },
  { id: "fungicide",   en: "Fungicide",   hi: "कवकनाशी",       mr: "बुरशीनाशक" },
  { id: "nutrient",    en: "Nutrient",    hi: "पोषक तत्व",     mr: "पोषक तत्त्व" },
];

const CROP_IDS = new Set(CROPS.map((c) => c.id));
const SPRAY_IDS = new Set(SPRAYS.map((s) => s.id));

const NAME_RE = /[A-Za-zऀ-ॿ]{2,}/;
const PHONE_RE = /^[6-9]\d{9}$/;
function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (PHONE_RE.test(digits)) return digits;
  if (digits.length === 11 && digits.startsWith("0") && PHONE_RE.test(digits.slice(1))) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91") && PHONE_RE.test(digits.slice(2))) return digits.slice(2);
  return null;
}

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
    inline_keyboard: rows.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))),
  };
}

function langButtons() {
  return inlineKeyboard(
    LANGS.map((l) => [{ text: LANG_LABEL[l], data: `lang:${l}` }]),
  );
}

function cropButtons(lang: Lang, perRow = 2) {
  const rows: { text: string; data: string }[][] = [];
  for (let i = 0; i < CROPS.length; i += perRow) {
    rows.push(
      CROPS.slice(i, i + perRow).map((c) => ({
        text: c[lang],
        data: `crop:${c.id}`,
      })),
    );
  }
  return inlineKeyboard(rows);
}

function sprayButtons(lang: Lang, perRow = 2) {
  const rows: { text: string; data: string }[][] = [];
  for (let i = 0; i < SPRAYS.length; i += perRow) {
    rows.push(
      SPRAYS.slice(i, i + perRow).map((s) => ({
        text: s[lang],
        data: `spray:${s.id}`,
      })),
    );
  }
  return inlineKeyboard(rows);
}

function dateButtons(lang: Lang) {
  const s = t(lang);
  const out: { text: string; data: string }[][] = [];
  const today = new Date();
  for (let day = 0; day < 7; day++) {
    const d = new Date(today.getTime() + day * 86400e3);
    const iso = d.toISOString().slice(0, 10);
    const label =
      day === 0 ? s.todayLabel : day === 1 ? s.tomorrowLabel : d.toDateString().slice(0, 10);
    out.push([{ text: label, data: `date:${iso}` }]);
  }
  return inlineKeyboard(out);
}

function consentButtons(lang: Lang) {
  return inlineKeyboard([[{ text: t(lang).acceptBtn, data: "consent:accept" }]]);
}

function confirmButtons(lang: Lang) {
  return inlineKeyboard([
    [
      { text: t(lang).confirmBtn, data: "confirm:yes" },
      { text: t(lang).cancelBtn, data: "confirm:no" },
    ],
  ]);
}

// Map internal id (en) → localized label for the confirm summary
function localizedLabel(kind: "crop" | "spray", id: string | undefined, lang: Lang): string {
  if (!id) return "—";
  if (kind === "crop") return CROPS.find((c) => c.id === id)?.[lang] ?? id;
  return SPRAYS.find((s) => s.id === id)?.[lang] ?? id;
}

// ────────────────────────────────────────────────────────────────
// DB helpers
// ────────────────────────────────────────────────────────────────
async function getTenantToken() {
  const { data } = await supa
    .from("tenants")
    .select("id, name, telegram_bot_token")
    .eq("id", SEED_TENANT_ID)
    .single();
  return {
    id: data?.id ?? SEED_TENANT_ID,
    name: data?.name ?? "AgroSpray",
    token: (data?.telegram_bot_token as string | null) ?? null,
  };
}

async function logMessage(row: Record<string, unknown>) {
  await supa.from("telegram_messages").insert(row);
}

async function getOrCreateSession(tenantId: string, chatId: string, userId: string | null, username: string | null) {
  const { data: existing } = await supa
    .from("farmer_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("telegram_chat_id", chatId)
    .maybeSingle();
  if (existing) return existing as Record<string, any>;
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
  return created as Record<string, any>;
}

async function setSession(id: string, patch: Record<string, unknown>) {
  await supa
    .from("farmer_sessions")
    .update({ ...patch, last_activity_at: new Date().toISOString() })
    .eq("id", id);
}

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
// Capture a free-form query and notify ops on Telegram.
// Used whenever the farmer sends text the state machine can't interpret.
// ────────────────────────────────────────────────────────────────
async function captureQuery(
  token: string,
  tenantId: string,
  chatId: string,
  userId: string | null,
  username: string | null,
  lang: Lang,
  text: string,
  state: string,
) {
  const { data, error } = await supa.rpc("tg_capture_query", {
    p_tenant_id: tenantId,
    p_telegram_chat_id: chatId,
    p_telegram_user_id: userId,
    p_username: username,
    p_language: lang,
    p_text: text,
    p_state: state,
  });
  if (error) {
    console.error("tg_capture_query failed", error);
    return;
  }
  const r = data as { id?: string; farmer_name?: string; phone?: string | null; ops_chat_id?: string | null };
  if (r?.ops_chat_id) {
    const langLabel = LANG_LABEL[lang] ?? lang;
    const opsBody =
      `📨 *New farmer query*\n` +
      `From: ${r.farmer_name ?? "Telegram user"}` +
      (r.phone ? ` · ${r.phone}` : "") +
      ` · ${langLabel}\n` +
      `In: \`${state}\`\n\n` +
      `> ${text.slice(0, 700)}\n\n` +
      `Reply at: https://agrospray.pages.dev/queries`;
    await tg("sendMessage", token, {
      chat_id: r.ops_chat_id,
      text: opsBody,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  }
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
  const lang: Lang = (session.language as Lang) ?? "en";
  const s = t(lang);

  if (callbackQueryId) {
    await tg("answerCallbackQuery", token, { callback_query_id: callbackQueryId });
  }

  const input = (callbackData ?? text ?? "").trim();
  const lower = input.toLowerCase();

  // Universal commands
  if (lower === "/cancel") {
    await setSession(session.id, { state: "idle", draft: {} });
    return reply(token, tenantId, chatId, s.cancelled);
  }

  // /start always restarts the journey, but reuses stored language + name
  // if we have them on file.
  if (lower === "/start") {
    let knownName: string | null = null;
    let storedLang: Lang | null = null;
    if (session.farmer_id) {
      const { data: f } = await supa
        .from("farmers")
        .select("name, default_language")
        .eq("id", session.farmer_id)
        .maybeSingle();
      if (f?.name && f.name !== "Telegram user") knownName = f.name as string;
      if (f?.default_language && LANGS.includes(f.default_language as Lang)) {
        storedLang = f.default_language as Lang;
      }
    }

    // First-time user (no consent on file) → always ask for language first.
    if (!session.consent_at) {
      await setSession(session.id, { state: "awaiting_language", draft: {} });
      return reply(token, tenantId, chatId, STRINGS.en.askLanguage, { reply_markup: langButtons() });
    }

    // Returning user — reuse stored language from farmer profile or current session.
    const effectiveLang: Lang = storedLang ?? lang;
    if (storedLang && storedLang !== lang) {
      await setSession(session.id, { language: storedLang });
    }
    const eff = t(effectiveLang);

    if (!session.consent_at) {
      await setSession(session.id, { state: "awaiting_consent", draft: {} });
      await reply(token, tenantId, chatId, eff.welcome(firstName));
      return reply(token, tenantId, chatId, eff.consent, { reply_markup: consentButtons(effectiveLang) });
    }

    if (!knownName) {
      await setSession(session.id, { state: "awaiting_name", draft: {} });
      await reply(token, tenantId, chatId, eff.welcome(firstName));
      return reply(token, tenantId, chatId, eff.askName);
    }

    await setSession(session.id, { state: "awaiting_crop", draft: { name: knownName } });
    await reply(token, tenantId, chatId, eff.hiAgain(knownName));
    return reply(token, tenantId, chatId, eff.askCrop, { reply_markup: cropButtons(effectiveLang) });
  }

  const draft: Draft = (session.draft as Draft) ?? {};

  switch (session.state) {
    case "awaiting_language": {
      let picked: Lang | null = null;
      if (callbackData?.startsWith("lang:")) {
        const v = callbackData.slice(5);
        if (LANGS.includes(v as Lang)) picked = v as Lang;
      }
      if (!picked) {
        if (text && !callbackData) {
          await captureQuery(token, tenantId, chatId, userId, username, lang, text, "awaiting_language");
          await reply(token, tenantId, chatId, STRINGS.en.queryReceived);
        }
        return reply(token, tenantId, chatId, STRINGS.en.askLanguage, { reply_markup: langButtons() });
      }
      await setSession(session.id, { state: "awaiting_consent", language: picked });
      const pickedStrings = t(picked);
      await reply(token, tenantId, chatId, pickedStrings.welcome(firstName));
      return reply(token, tenantId, chatId, pickedStrings.consent, { reply_markup: consentButtons(picked) });
    }
    case "awaiting_consent": {
      if (callbackData === "consent:accept" || lower === "accept") {
        await setSession(session.id, {
          state: "awaiting_name",
          consent_at: new Date().toISOString(),
        });
        await reply(token, tenantId, chatId, s.consentAccepted);
        return reply(token, tenantId, chatId, s.askName);
      }
      if (text && !callbackData) {
        await captureQuery(token, tenantId, chatId, userId, username, lang, text, "awaiting_consent");
        await reply(token, tenantId, chatId, s.queryReceived);
      }
      return reply(token, tenantId, chatId, s.consent, { reply_markup: consentButtons(lang) });
    }
    case "awaiting_name": {
      const candidate = (text ?? "").trim();
      if (!candidate || !NAME_RE.test(candidate)) {
        return reply(token, tenantId, chatId, s.notValidName);
      }
      await setSession(session.id, {
        state: "awaiting_phone",
        draft: { ...draft, name: candidate },
      });
      return reply(token, tenantId, chatId, s.askPhone);
    }
    case "awaiting_phone": {
      const phone = normalisePhone(text ?? "");
      if (!phone) {
        return reply(token, tenantId, chatId, s.notValidPhone);
      }
      await setSession(session.id, {
        state: "awaiting_crop",
        draft: { ...draft, phone },
      });
      return reply(token, tenantId, chatId, s.askCrop, { reply_markup: cropButtons(lang) });
    }
    case "awaiting_crop": {
      let crop: string | null = null;
      if (callbackData?.startsWith("crop:")) crop = callbackData.slice(5);
      else if (CROP_IDS.has(lower)) crop = lower;
      if (!crop) {
        if (text && !callbackData) {
          await captureQuery(token, tenantId, chatId, userId, username, lang, text, "awaiting_crop");
          await reply(token, tenantId, chatId, s.queryReceived);
        }
        return reply(token, tenantId, chatId, s.askCrop, { reply_markup: cropButtons(lang) });
      }
      await setSession(session.id, {
        state: "awaiting_area",
        draft: { ...draft, crop },
      });
      return reply(token, tenantId, chatId, s.askArea);
    }
    case "awaiting_area": {
      const n = Number(text);
      if (!Number.isFinite(n) || n <= 0) {
        return reply(token, tenantId, chatId, s.notNumber);
      }
      await setSession(session.id, {
        state: "awaiting_date",
        draft: { ...draft, area_acres: n },
      });
      return reply(token, tenantId, chatId, s.askDate, { reply_markup: dateButtons(lang) });
    }
    case "awaiting_date": {
      let iso: string | null = null;
      if (callbackData?.startsWith("date:")) iso = callbackData.slice(5);
      else if (/^\d{4}-\d{2}-\d{2}$/.test(input)) iso = input;
      if (!iso) {
        if (text && !callbackData) {
          await captureQuery(token, tenantId, chatId, userId, username, lang, text, "awaiting_date");
          await reply(token, tenantId, chatId, s.queryReceived);
        }
        return reply(token, tenantId, chatId, s.askDate, { reply_markup: dateButtons(lang) });
      }
      await setSession(session.id, {
        state: "awaiting_village",
        draft: { ...draft, scheduled_date: iso },
      });
      return reply(token, tenantId, chatId, s.askVillage);
    }
    case "awaiting_village": {
      if (!text || text.length < 2) {
        return reply(token, tenantId, chatId, s.askVillage);
      }
      await setSession(session.id, {
        state: "awaiting_spray_type",
        draft: { ...draft, village: text },
      });
      return reply(token, tenantId, chatId, s.askSprayType, { reply_markup: sprayButtons(lang) });
    }
    case "awaiting_spray_type": {
      let spray: string | null = null;
      if (callbackData?.startsWith("spray:")) spray = callbackData.slice(6);
      else if (SPRAY_IDS.has(lower)) spray = lower;
      if (!spray) {
        if (text && !callbackData) {
          await captureQuery(token, tenantId, chatId, userId, username, lang, text, "awaiting_spray_type");
          await reply(token, tenantId, chatId, s.queryReceived);
        }
        return reply(token, tenantId, chatId, s.askSprayType, { reply_markup: sprayButtons(lang) });
      }
      const nextDraft = { ...draft, spray_type: spray };
      await setSession(session.id, { state: "awaiting_confirm", draft: nextDraft });
      const displayDraft: Draft = {
        ...nextDraft,
        crop: localizedLabel("crop", nextDraft.crop, lang),
        spray_type: localizedLabel("spray", nextDraft.spray_type, lang),
      };
      return reply(token, tenantId, chatId, s.askConfirm(displayDraft), {
        reply_markup: confirmButtons(lang),
      });
    }
    case "awaiting_confirm": {
      if (callbackData === "confirm:no" || lower === "cancel") {
        await setSession(session.id, { state: "idle", draft: {} });
        return reply(token, tenantId, chatId, s.cancelled);
      }
      if (callbackData === "confirm:yes" || lower === "confirm") {
        const { data, error } = await supa.rpc("tg_finalize_booking", {
          p_tenant_id: tenantId,
          p_telegram_chat_id: chatId,
        });
        if (error) {
          console.error("finalize error", error);
          return reply(token, tenantId, chatId, `❌ ${error.message}`);
        }
        const r = data as { status: string; job_number?: string; total?: string };
        if (r.status === "inquiry") {
          return reply(token, tenantId, chatId, s.inquiryReceived(r.job_number ?? "AGR-?"));
        }
        if (r.status === "confirmed") {
          return reply(token, tenantId, chatId, s.confirmed(r.job_number ?? "AGR-?", r.total ?? "0"));
        }
        if (r.status === "wishlisted") {
          return reply(token, tenantId, chatId, s.wishlisted(r.job_number ?? "AGR-?"));
        }
        return reply(token, tenantId, chatId, s.compFail(r.job_number ?? "AGR-?"));
      }
      if (text && !callbackData) {
        await captureQuery(token, tenantId, chatId, userId, username, lang, text, "awaiting_confirm");
        await reply(token, tenantId, chatId, s.queryReceived);
      }
      const displayDraft: Draft = {
        ...draft,
        crop: localizedLabel("crop", draft.crop, lang),
        spray_type: localizedLabel("spray", draft.spray_type, lang),
      };
      return reply(token, tenantId, chatId, s.askConfirm(displayDraft), {
        reply_markup: confirmButtons(lang),
      });
    }
    default: {
      // idle or unknown — if the farmer typed free-form text, file it as a
      // query. They don't have a flow to resume so just acknowledge.
      if (text && !callbackData) {
        await captureQuery(token, tenantId, chatId, userId, username, lang, text, session.state ?? "idle");
        return reply(token, tenantId, chatId, s.queryReceivedIdle);
      }
      await setSession(session.id, { state: "awaiting_language", draft: {} });
      return reply(token, tenantId, chatId, STRINGS.en.askLanguage, { reply_markup: langButtons() });
    }
  }
}

// ────────────────────────────────────────────────────────────────
// HTTP entry
// ────────────────────────────────────────────────────────────────
// @ts-expect-error  Deno global
Deno.serve(async (req: Request) => {
  if (req.method === "GET") return new Response("ok", { status: 200 });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const update = (await req.json().catch(() => null)) as any;
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
