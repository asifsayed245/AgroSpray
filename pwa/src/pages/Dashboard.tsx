import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Calendar,
  Wheat,
  ChevronRight,
  AlertCircle,
  Cloud,
  Inbox,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PrimaryStatCard } from "@/components/layout/PrimaryStatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { StatArc } from "@/components/ui/stat-arc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { dashboardSummary, listJobs, listComplianceBlocks, weatherAlertsCount, inquiryCount } from "@/data/queries";
import { inr } from "@/lib/utils";

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

export default function Dashboard() {
  const summaryQ = useSupabaseQuery(async () => ({ data: await dashboardSummary(), error: null }));
  const weatherQ = useSupabaseQuery(async () => {
    const { count, error } = await weatherAlertsCount();
    return { data: count ?? 0, error };
  });
  const inquiriesQ = useSupabaseQuery(async () => {
    const { count, error } = await inquiryCount();
    return { data: count ?? 0, error };
  });
  const today = new Date().toISOString().slice(0, 10);
  const jobsQ = useSupabaseQuery(() => listJobs({ from: today, to: today }), [today]);
  const blocksQ = useSupabaseQuery(listComplianceBlocks);

  const summary = summaryQ.data ?? {
    slotsBooked: 0,
    slotsCapacity: 0,
    revenueToday: 0,
    complianceBlocks: 0,
    activeJobs: 0,
  };
  const jobs = jobsQ.data ?? [];
  const blocks = blocksQ.data ?? [];

  const utilisationPct =
    summary.slotsCapacity > 0
      ? Math.round((summary.slotsBooked / summary.slotsCapacity) * 100)
      : 0;
  const complianceScore = Math.max(0, 100 - blocks.length * 8);

  return (
    <>
      <TopBar title="My Operations" unread={blocks.length} />
      <div className="page space-y-4">
        <PrimaryStatCard
          label="Slots today"
          primary={`${summary.slotsBooked} / ${summary.slotsCapacity}`}
          caption={`${utilisationPct}% utilised · ${inr(summary.revenueToday)} booked`}
          href="/jobs"
          hrefLabel="Open jobs"
        />

        <Tabs defaultValue="ops">
          <TabsList>
            <TabsTrigger value="ops">Operations</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="ops" className="space-y-4">
            <QuickGrid
              blocks={blocks.length}
              slotsBooked={summary.slotsBooked}
              weatherAlerts={(weatherQ.data as number | null) ?? 0}
              inquiries={(inquiriesQ.data as number | null) ?? 0}
            />
            <TodaysJobs jobs={jobs} loading={jobsQ.loading} />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <ComplianceScoreCard score={complianceScore} />
            <BlocksList blocks={blocks.slice(0, 3)} loading={blocksQ.loading} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function QuickGrid({
  blocks,
  slotsBooked,
  weatherAlerts,
  inquiries,
}: {
  blocks: number;
  slotsBooked: number;
  weatherAlerts: number;
  inquiries: number;
}) {
  const items = [
    { to: "/jobs?state=inquiry", icon: Inbox, label: "Inquiries", count: inquiries, tone: inquiries > 0 ? ("warn" as const) : ("brand" as const) },
    { to: "/compliance", icon: ShieldCheck, label: "Compliance", count: blocks, tone: blocks > 0 ? ("warn" as const) : ("brand" as const) },
    { to: "/jobs?weather=alert", icon: Cloud, label: "Weather", count: weatherAlerts, tone: weatherAlerts > 0 ? ("warn" as const) : ("brand" as const) },
    { to: "/slots", icon: Calendar, label: "Schedule", count: slotsBooked, tone: "brand" as const },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(({ to, icon: Icon, label, count, tone }) => (
        <Link
          key={to}
          to={to}
          className="card flex flex-col items-center justify-center gap-2 p-3 text-center transition-shadow hover:shadow-pop"
        >
          <IconTile tone={tone as "warn" | "brand"}>
            <Icon className="h-5 w-5" />
          </IconTile>
          <div className="text-[11px] font-medium text-ink-500">{label}</div>
          <div className="text-sm font-semibold text-ink-900 tnum">{count}</div>
        </Link>
      ))}
    </div>
  );
}

type Job = NonNullable<Awaited<ReturnType<typeof listJobs>>["data"]>[number];

function TodaysJobs({ jobs, loading }: { jobs: Job[]; loading: boolean }) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <div className="text-sm font-semibold text-ink-900">Today's jobs</div>
          <div className="text-xs text-ink-500">{jobs.length} on the schedule</div>
        </div>
        <Link to="/jobs" className="text-xs font-semibold text-brand-700">
          View all
        </Link>
      </div>
      <ul className="divide-y divide-ink-900/5 mt-2">
        {loading && <li className="px-4 py-3 text-xs text-ink-500">Loading…</li>}
        {!loading && jobs.length === 0 && (
          <li className="px-4 py-4 text-xs text-ink-500 text-center">No jobs scheduled today.</li>
        )}
        {jobs.map((j) => (
          <li key={j.id}>
            <Link
              to={`/jobs/${j.id}`}
              className="flex items-center gap-3 px-4 py-3 active:bg-ink-900/3"
            >
              <IconTile tone="mint">
                <Wheat className="h-5 w-5" />
              </IconTile>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink-900">
                    {j.farmer?.name ?? "Walk-in"}
                  </span>
                  <Badge tone={stateTone[j.state] ?? "neutral"}>
                    {stateLabel[j.state] ?? j.state}
                  </Badge>
                </div>
                <div className="truncate text-xs text-ink-500">
                  {j.crop} · {j.area_acres} ac · {j.village ?? j.farmer?.village}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-ink-400" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ComplianceScoreCard({ score }: { score: number }) {
  return (
    <Card className="flex flex-col items-center p-5">
      <div className="text-xs uppercase tracking-wide text-ink-500">Compliance health</div>
      <StatArc value={score} label="Your score" />
      <p className="mt-2 max-w-xs text-center text-xs text-ink-500">
        Score derives from open compliance blocks, override frequency, and expiring credentials across
        your fleet and crew.
      </p>
    </Card>
  );
}

type Block = NonNullable<Awaited<ReturnType<typeof listComplianceBlocks>>["data"]>[number];

function BlocksList({ blocks, loading }: { blocks: Block[]; loading: boolean }) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="text-sm font-semibold text-ink-900">Improve my compliance</div>
        <Link to="/compliance" className="text-xs font-semibold text-brand-700">
          See all
        </Link>
      </div>
      <ul className="mt-2 divide-y divide-ink-900/5">
        {loading && <li className="px-4 py-3 text-xs text-ink-500">Loading…</li>}
        {!loading && blocks.length === 0 && (
          <li className="px-4 py-4 text-xs text-ink-500 text-center">No blocks — all clear.</li>
        )}
        {blocks.map((b: Block) => (
          <li key={b.id} className="flex items-center gap-3 px-4 py-3">
            <IconTile tone="warn"><AlertCircle className="h-5 w-5" /></IconTile>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink-900">
                {String(b.check_type).replace("_", " ")}
              </div>
              <div className="truncate text-xs text-ink-500">{b.reason}</div>
            </div>
            <Button variant="soft" size="sm" asChild>
              <Link to={`/jobs/${(b as { job_id: string }).job_id}`}>Open</Link>
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
