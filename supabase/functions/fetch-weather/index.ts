// fetch-weather — per-job Open-Meteo forecast + safety eval + (optional)
// supplier notification fan-out. Service-role, verify_jwt=false so it can be
// invoked from the cron jobs as well as from the PWA "Refresh" button.

// @ts-expect-error  Deno import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// @ts-expect-error  Deno global
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-expect-error
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, content-type, x-client-info, apikey",
  "access-control-allow-methods": "POST, OPTIONS",
};

const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

const TERMINAL_STATES = new Set([
  "complete", "paid", "cancelled", "failed", "disputed",
]);

type DailyRow = {
  date: string;
  t_max: number;
  t_min: number;
  wind_max: number;
  rain_mm: number;
  rain_pct: number;
  safety: "good" | "marginal" | "unsafe";
};

// DGCA-strict thresholds (per plan)
function classify(windMax: number, rainPct: number): DailyRow["safety"] {
  if (windMax > 15 || rainPct > 50) return "unsafe";
  if (windMax > 12 || rainPct > 30) return "marginal";
  return "good";
}

// Open-Meteo geocoding. The parameter is `country_code` (ISO alpha-2), and
// the lookup is just a fuzzy match against a global place index, so we
// disambiguate small Indian villages by post-filtering results to country=IN.
async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query) return null;
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const r = await fetch(url);
  if (!r.ok) return null;
  const j = await r.json();
  const results = (j?.results ?? []) as Array<{
    latitude: number;
    longitude: number;
    country_code?: string;
    country?: string;
    admin1?: string;
  }>;
  if (results.length === 0) return null;
  // Prefer India hits; fall back to the first global hit only if nothing
  // matches IN (which means the user really did set a foreign village).
  const indian = results.find((r) => r.country_code === "IN" || r.country === "India");
  const hit = indian ?? results[0];
  return { lat: Number(hit.latitude), lng: Number(hit.longitude) };
}

async function fetchForecast(lat: number, lng: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lng));
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,wind_speed_10m_max",
  );
  url.searchParams.set("past_days", "3");
  url.searchParams.set("forecast_days", "4");
  url.searchParams.set("timezone", "Asia/Kolkata");
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

function buildDaily(om: any): DailyRow[] {
  const d = om?.daily;
  if (!d?.time) return [];
  const out: DailyRow[] = [];
  for (let i = 0; i < d.time.length; i++) {
    const wind = Number(d.wind_speed_10m_max?.[i] ?? 0);
    const rainPct = Number(d.precipitation_probability_max?.[i] ?? 0);
    out.push({
      date: d.time[i],
      t_max: Number(d.temperature_2m_max?.[i] ?? 0),
      t_min: Number(d.temperature_2m_min?.[i] ?? 0),
      wind_max: wind,
      rain_mm: Number(d.rain_sum?.[i] ?? 0),
      rain_pct: rainPct,
      safety: classify(wind, rainPct),
    });
  }
  return out;
}

async function notifySupplier(args: {
  tenant_id: string;
  job: any;
  village: string;
  bookingDate: string;
  daily: DailyRow[];
  safety: DailyRow["safety"];
  reason: "change" | "daily_reminder";
  stage?: "D-2" | "D-1";
}) {
  const { tenant_id, job, village, bookingDate, daily, safety, reason, stage } = args;
  const bookingDay = daily.find((d) => d.date === bookingDate) ?? daily[Math.floor(daily.length / 2)];

  const safetyLabel = safety === "unsafe" ? "❌ Unsafe" : safety === "marginal" ? "⚠️ Marginal" : "✅ Good";
  const lead =
    reason === "daily_reminder"
      ? stage === "D-2"
        ? `Heads up — ${village} on ${bookingDate}`
        : `Tomorrow's spray at ${village}`
      : `Weather updated for ${village} on ${bookingDate}`;

  const body =
    `${lead}: ${safetyLabel}\n` +
    `Wind ${Math.round(bookingDay.wind_max)} km/h · ` +
    `Rain ${bookingDay.rain_pct}% · ` +
    `${Math.round(bookingDay.t_min)}-${Math.round(bookingDay.t_max)}°C`;

  // 1. In-app notification
  await supa.from("notifications").insert({
    tenant_id,
    category: "weather.warning",
    title: `Weather alert · ${job.number}`,
    body,
    delivery_channel: "in_app",
    delivery_status: "delivered",
    sent_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
    payload: { job_id: job.id, safety, bookingDate, village },
  });

  // 2. Telegram to ops chat if configured
  const { data: tenant } = await supa
    .from("tenants")
    .select("name, telegram_bot_token, telegram_ops_chat_id")
    .eq("id", tenant_id)
    .single();
  if (tenant?.telegram_bot_token && tenant?.telegram_ops_chat_id) {
    const tgText =
      `🌦️ *${safetyLabel}* — \`${job.number}\`\n` +
      `${body}\n\n` +
      `Open: https://agrospray.pages.dev/jobs/${job.id}`;
    await fetch(`https://api.telegram.org/bot${tenant.telegram_bot_token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: tenant.telegram_ops_chat_id,
        text: tgText,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
  }

  await supa.rpc("tg_mark_weather_notified", { p_job_id: job.id, p_safety: safety });
}

// @ts-expect-error  Deno global
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: cors });

  const body = (await req.json().catch(() => null)) as {
    job_id?: string;
    force?: boolean;
    notify?: boolean;
    notify_stage?: "D-2" | "D-1";
    force_notify?: boolean;
  } | null;
  if (!body?.job_id) {
    return Response.json({ error: "job_id required" }, { status: 400, headers: cors });
  }

  // 1. Load job
  const { data: job, error: jobErr } = await supa
    .from("jobs")
    .select("id, tenant_id, number, state, village, location_lat, location_lng, scheduled_date, weather_last_notified_safety")
    .eq("id", body.job_id)
    .single();
  if (jobErr || !job) {
    return Response.json({ error: "job not found" }, { status: 404, headers: cors });
  }
  if (TERMINAL_STATES.has(job.state)) {
    return Response.json({ status: "skipped", reason: "terminal_state" }, { headers: cors });
  }

  // 2. Geocode if missing
  let lat = job.location_lat as number | null;
  let lng = job.location_lng as number | null;
  if (lat == null || lng == null) {
    let geo = await geocode(job.village ?? "");
    if (!geo) {
      // Try a tenant-state fallback as a coarse anchor
      const { data: tenant } = await supa.from("tenants").select("state").eq("id", job.tenant_id).single();
      if (tenant?.state) geo = await geocode(tenant.state);
    }
    if (!geo) {
      return Response.json({ status: "no_location" }, { headers: cors });
    }
    lat = geo.lat;
    lng = geo.lng;
    await supa.rpc("tg_set_job_location", { p_job_id: job.id, p_lat: lat, p_lng: lng });
  }

  // 3. Cache hit?
  if (!body.force) {
    const since = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    const { data: cached } = await supa
      .from("weather_snapshots")
      .select("*")
      .eq("job_id", job.id)
      .gte("fetched_at", since)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cached) {
      return Response.json({ status: "cached", snapshot: cached }, { headers: cors });
    }
  }

  // 4. Open-Meteo
  const om = await fetchForecast(lat, lng);
  const daily = buildDaily(om);
  if (daily.length === 0) {
    return Response.json({ error: "no daily data" }, { status: 502, headers: cors });
  }

  const bookingRow = daily.find((d) => d.date === job.scheduled_date) ?? daily[Math.floor(daily.length / 2)];
  const safety = bookingRow.safety;

  const { data: snapshot, error: snapErr } = await supa
    .from("weather_snapshots")
    .insert({
      tenant_id: job.tenant_id,
      job_id: job.id,
      lat,
      lng,
      source: "open-meteo",
      daily,
      booking_date_safety: safety,
    })
    .select()
    .single();
  if (snapErr) {
    return Response.json({ error: snapErr.message }, { status: 500, headers: cors });
  }

  // 5. Apply to job + decide on notifications
  const applyRes = await supa.rpc("tg_apply_weather_snapshot", {
    p_job_id: job.id,
    p_safety: safety,
  });
  const changed = (applyRes.data as { changed: boolean } | null)?.changed ?? false;

  // Notification rules:
  //   - force_notify=true (cron daily reminder): always send
  //   - notify=true + safety changed into marginal/unsafe: send
  let notified = false;
  if (body.force_notify || (body.notify && changed && safety !== "good")) {
    await notifySupplier({
      tenant_id: job.tenant_id,
      job,
      village: job.village ?? "the field",
      bookingDate: job.scheduled_date,
      daily,
      safety,
      reason: body.force_notify ? "daily_reminder" : "change",
      stage: body.notify_stage,
    });
    notified = true;
  }

  return Response.json(
    { status: "fresh", safety, changed, notified, snapshot },
    { headers: cors },
  );
});
