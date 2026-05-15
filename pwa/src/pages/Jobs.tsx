import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Wheat, ChevronRight, Plus, Filter, Wind } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { Button } from "@/components/ui/button";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { listJobs, listLatestWeatherForJobs } from "@/data/queries";
import type { JobRow, WeatherDay, WeatherSafety } from "@/data/queries";

const TERMINAL_STATES = new Set(["complete", "invoiced", "paid", "cancelled", "failed"]);

// Tailwind classes per safety — kept centralised so card + day cells stay in sync.
const SAFETY_CELL: Record<WeatherSafety, string> = {
  good:     "bg-mint-100 text-mint-800 border-mint-300",
  marginal: "bg-amber-100 text-amber-800 border-amber-300",
  unsafe:   "bg-red-100 text-red-800 border-red-300",
};
const SAFETY_DOT: Record<WeatherSafety, string> = {
  good:     "bg-mint-500",
  marginal: "bg-amber-500",
  unsafe:   "bg-red-500",
};
const SAFETY_DATE_TEXT: Record<WeatherSafety, string> = {
  good:     "text-mint-700",
  marginal: "text-amber-700",
  unsafe:   "text-red-700",
};

function weekdayShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });
}
function dayNum(iso: string) {
  return String(new Date(iso).getDate()).padStart(2, "0");
}

// 5-day mini strip: D-1 → D+3, booking date emphasised with a thicker ring.
function WeatherStrip({
  daily,
  bookingDate,
}: {
  daily: WeatherDay[];
  bookingDate: string;
}) {
  if (!daily || daily.length === 0) return null;
  const bookingIdx = daily.findIndex((d) => d.date === bookingDate);
  if (bookingIdx < 0) return null;
  // Try to show D-1 .. D+3. Clamp to available range.
  const start = Math.max(0, bookingIdx - 1);
  const end = Math.min(daily.length, bookingIdx + 4);
  const slice = daily.slice(start, end);
  return (
    <div className="mt-2 grid grid-cols-5 gap-1">
      {slice.map((d) => {
        const isBooking = d.date === bookingDate;
        return (
          <div
            key={d.date}
            className={`rounded-md border px-1 py-1 text-center ${SAFETY_CELL[d.safety]} ${
              isBooking ? "ring-2 ring-brand-700 ring-offset-1 ring-offset-white" : ""
            }`}
            title={`${d.date}: ${d.safety} · wind ${Math.round(d.wind_max)} km/h · rain ${d.rain_pct}%`}
          >
            <div className="text-[9px] uppercase opacity-80">{weekdayShort(d.date)}</div>
            <div className="text-[12px] font-bold leading-none tnum">{dayNum(d.date)}</div>
            <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[9px] tnum">
              <Wind className="h-2 w-2" />
              {Math.round(d.wind_max)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const STATE_FILTERS = [
  "all",
  "compliance",
  "confirmed",
  "crew_assigned",
  "in_progress",
  "complete",
  "comp_fail",
  "cancelled",
] as const;

const stateLabel: Record<string, string> = {
  draft: "Draft",
  compliance: "Compliance",
  confirmed: "Confirmed",
  crew_assigned: "Crew assigned",
  in_progress: "In progress",
  complete: "Complete",
  invoiced: "Invoiced",
  paid: "Paid",
  wishlist: "Wishlist",
  comp_fail: "Comp. fail",
  cancelled: "Cancelled",
  failed: "Failed",
  disputed: "Disputed",
};

const stateTone: Record<string, Parameters<typeof Badge>[0]["tone"]> = {
  draft: "neutral",
  compliance: "warn",
  confirmed: "info",
  crew_assigned: "info",
  in_progress: "brand",
  complete: "ok",
  invoiced: "ok",
  paid: "ok",
  wishlist: "neutral",
  comp_fail: "danger",
  cancelled: "neutral",
  failed: "danger",
  disputed: "danger",
};

export default function Jobs() {
  const [filter, setFilter] = useState<(typeof STATE_FILTERS)[number]>("all");
  const { data, loading, error } = useSupabaseQuery(
    () => listJobs(filter === "all" ? {} : { state: filter }),
    [filter],
  );
  const jobs = (data ?? []) as JobRow[];

  // Pull the latest snapshot per non-terminal job so we can draw the strip.
  const trackableIds = useMemo(
    () => jobs.filter((j) => !TERMINAL_STATES.has(j.state)).map((j) => j.id),
    [jobs],
  );
  const [weatherByJob, setWeatherByJob] = useState<Record<string, { daily: WeatherDay[] }>>({});
  useEffect(() => {
    if (trackableIds.length === 0) {
      setWeatherByJob({});
      return;
    }
    let cancelled = false;
    listLatestWeatherForJobs(trackableIds).then(({ data: rows }) => {
      if (cancelled) return;
      const map: Record<string, { daily: WeatherDay[] }> = {};
      for (const r of rows ?? []) {
        map[r.job_id] = { daily: r.daily ?? [] };
      }
      setWeatherByJob(map);
    });
    return () => {
      cancelled = true;
    };
  }, [trackableIds.join("|")]);

  return (
    <>
      <TopBar title="Jobs" />
      <div className="page space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">
            All bookings <span className="text-ink-500">({jobs.length})</span>
          </h2>
          <Button asChild size="sm">
            <Link to="/jobs/new"><Plus className="h-4 w-4" /> New</Link>
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {STATE_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`pill border whitespace-nowrap ${
                filter === s
                  ? "bg-brand-700 text-white border-brand-700"
                  : "bg-white text-ink-700 border-ink-900/8"
              }`}
            >
              <Filter className="h-3 w-3" />
              {s === "all" ? "All states" : stateLabel[s] ?? s}
            </button>
          ))}
        </div>

        {error && (
          <Card className="border border-red-100 bg-red-50/50">
            <div className="text-sm text-danger">Couldn't load jobs: {error}</div>
            <div className="text-xs text-ink-500 mt-1">
              Make sure your Supabase env is configured (see .env.local.example) and the local stack is up.
            </div>
          </Card>
        )}

        {loading && <Card>Loading…</Card>}

        <ul className="space-y-2">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link to={`/jobs/${j.id}`}>
                <Card className="transition-shadow hover:shadow-pop">
                  <div className="row">
                    <IconTile tone="mint">
                      <Wheat className="h-5 w-5" />
                    </IconTile>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-ink-900 truncate">
                          {j.farmer?.name ?? "Walk-in"}
                        </span>
                        <Badge tone={stateTone[j.state] ?? "neutral"}>
                          {stateLabel[j.state] ?? j.state}
                        </Badge>
                      </div>
                      <div className="text-xs text-ink-500 truncate">
                        {j.crop} · {j.area_acres} ac · {j.village ?? j.farmer?.village} ·{" "}
                        <span
                          className={
                            j.weather_safety && !TERMINAL_STATES.has(j.state)
                              ? `font-semibold ${SAFETY_DATE_TEXT[j.weather_safety as WeatherSafety]}`
                              : ""
                          }
                        >
                          {j.scheduled_date}
                        </span>
                      </div>
                      <div className="text-[11px] text-ink-400 truncate mt-0.5">{j.number}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-400" />
                  </div>

                  {!TERMINAL_STATES.has(j.state) && weatherByJob[j.id]?.daily && (
                    <WeatherStrip
                      daily={weatherByJob[j.id].daily}
                      bookingDate={j.scheduled_date}
                    />
                  )}
                  {!TERMINAL_STATES.has(j.state)
                    && !weatherByJob[j.id]?.daily
                    && j.weather_safety && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-500">
                        <span className={`h-2 w-2 rounded-full ${SAFETY_DOT[j.weather_safety as WeatherSafety]}`} />
                        Weather: {j.weather_safety}
                      </div>
                    )}
                </Card>
              </Link>
            </li>
          ))}
          {!loading && jobs.length === 0 && (
            <Card className="text-center py-10">
              <div className="text-sm text-ink-500">No jobs match this filter.</div>
              <Button asChild className="mt-4" size="sm">
                <Link to="/jobs/new">
                  <Plus className="h-4 w-4" /> Create job
                </Link>
              </Button>
            </Card>
          )}
        </ul>
      </div>
    </>
  );
}
