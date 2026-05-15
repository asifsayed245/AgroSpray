// fetch-weather-batch — invoked by pg_cron. Walks the right cohort of upcoming
// jobs and calls fetch-weather per job. Two modes:
//
//   { mode: 'refresh' }        — every 4h. Refresh all active jobs within +7d.
//                                 Only fires notifications when safety colour flips.
//   { mode: 'daily_reminder' } — 06:00 IST. For jobs scheduled at D-2 and D-1,
//                                 always sends a reminder regardless of safety.

// @ts-expect-error  Deno import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// @ts-expect-error
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// @ts-expect-error
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supa = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ACTIVE_STATES = ["confirmed", "crew_assigned", "in_progress"];

function isoDateOffset(days: number) {
  const d = new Date(Date.now() + days * 86400e3);
  return d.toISOString().slice(0, 10);
}

async function invokeFetchWeather(payload: Record<string, unknown>) {
  // Internal call — same project, same service-role key.
  const r = await fetch(`${SUPABASE_URL}/functions/v1/fetch-weather`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Edge functions accept the service key as a bearer for internal hops.
      authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) console.error("fetch-weather call failed", r.status, await r.text());
  return r.ok;
}

// @ts-expect-error  Deno.serve
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const body = (await req.json().catch(() => null)) as { mode?: string } | null;
  const mode = body?.mode ?? "refresh";

  if (mode === "refresh") {
    const today = isoDateOffset(0);
    const horizon = isoDateOffset(7);
    const { data: jobs } = await supa
      .from("jobs")
      .select("id, scheduled_date, state")
      .in("state", ACTIVE_STATES)
      .gte("scheduled_date", today)
      .lte("scheduled_date", horizon);

    let processed = 0;
    for (const j of jobs ?? []) {
      // notify=true + the change-check inside fetch-weather means we only ping
      // on colour flips into marginal/unsafe.
      const ok = await invokeFetchWeather({ job_id: j.id, notify: true });
      if (ok) processed++;
    }
    return Response.json({ mode, processed, total: jobs?.length ?? 0 });
  }

  if (mode === "daily_reminder") {
    // Cover D-1 and D-2 — explicit reminders the user asked for.
    const d1 = isoDateOffset(1);
    const d2 = isoDateOffset(2);
    let processed = 0;

    for (const [date, stage] of [
      [d2, "D-2"] as const,
      [d1, "D-1"] as const,
    ]) {
      const { data: jobs } = await supa
        .from("jobs")
        .select("id, scheduled_date")
        .in("state", ACTIVE_STATES)
        .eq("scheduled_date", date);
      for (const j of jobs ?? []) {
        const ok = await invokeFetchWeather({
          job_id: j.id,
          force: true,
          force_notify: true,
          notify_stage: stage,
        });
        if (ok) processed++;
      }
    }
    return Response.json({ mode, processed });
  }

  return Response.json({ error: `unknown mode ${mode}` }, { status: 400 });
});
