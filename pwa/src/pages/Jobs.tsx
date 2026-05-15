import { useState } from "react";
import { Link } from "react-router-dom";
import { Wheat, ChevronRight, Plus, Filter, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { Button } from "@/components/ui/button";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { listJobs } from "@/data/queries";
import type { JobRow } from "@/data/queries";

const TERMINAL_STATES = new Set(["complete", "invoiced", "paid", "cancelled", "failed"]);

function WeatherPill({ safety }: { safety?: "good" | "marginal" | "unsafe" | null }) {
  if (!safety) return null;
  const map = {
    good:     { Icon: CheckCircle2,  cls: "bg-mint-50 text-mint-700 border-mint-200",   label: "Spray-safe" },
    marginal: { Icon: AlertTriangle, cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Marginal" },
    unsafe:   { Icon: XCircle,       cls: "bg-red-50 text-red-700 border-red-200",       label: "Unsafe" },
  } as const;
  const { Icon, cls, label } = map[safety];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
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
                        {!TERMINAL_STATES.has(j.state) && <WeatherPill safety={j.weather_safety} />}
                      </div>
                      <div className="text-xs text-ink-500 truncate">
                        {j.crop} · {j.area_acres} ac · {j.village ?? j.farmer?.village} · {j.scheduled_date}
                      </div>
                      <div className="text-[11px] text-ink-400 truncate mt-0.5">{j.number}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-400" />
                  </div>
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
