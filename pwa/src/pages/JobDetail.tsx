import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  User,
  Wheat,
  Plane,
  Calendar,
  Receipt,
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { OverrideModal } from "@/components/OverrideModal";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import {
  assignCrew,
  cancelJob,
  completeJob,
  getJob,
  listSortiesForJob,
  listDrones,
  listPilots,
  overrideState,
  submitJobForCompliance,
} from "@/data/queries";
import { inr } from "@/lib/utils";

const STATE_LABEL: Record<string, string> = {
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

export default function JobDetail() {
  const { id } = useParams();
  const job = useSupabaseQuery(() => getJob(id!), [id]);
  const sorties = useSupabaseQuery(() => listSortiesForJob(id!), [id]);
  const drones = useSupabaseQuery(listDrones, []);
  const pilots = useSupabaseQuery(listPilots, []);

  const [showOverride, setShowOverride] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const j = job.data;

  async function refresh() {
    await Promise.all([job.refresh(), sorties.refresh()]);
  }

  async function act(fn: () => Promise<{ error: { message: string } | null }>) {
    setBusy(true);
    setError(null);
    const { error } = await fn();
    setBusy(false);
    if (error) setError(error.message);
    else refresh();
  }

  if (job.loading) {
    return (
      <>
        <TopBar title="Job" />
        <div className="page"><Card>Loading…</Card></div>
      </>
    );
  }

  if (!j) {
    return (
      <>
        <TopBar title="Job not found" />
        <div className="page"><Card>This job doesn't exist or you don't have access.</Card></div>
      </>
    );
  }

  const pricing = j.pricing_snapshot as { total?: number; subtotal?: number; tax?: number } | null;
  const farmer = j.farmer;
  const pilot = pilots.data?.find((p) => p.id === j.assigned_pilot_id);
  const drone = drones.data?.find((d) => d.id === j.assigned_drone_id);

  return (
    <>
      <TopBar title="Job details" />
      <div className="page space-y-4">
        {/* Hero */}
        <Card className="bg-brand-gradient text-white p-5 shadow-pop overflow-hidden relative">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <Badge className="bg-white/15 text-white border border-white/20">
              {STATE_LABEL[j.state] ?? j.state}
            </Badge>
            <h1 className="mt-3 text-xl font-bold">{farmer?.name ?? "Walk-in customer"}</h1>
            <div className="text-sm text-white/80 mt-1">{j.number}</div>
            <div className="mt-3 text-sm text-white/90">
              {j.crop} · {j.area_acres} acres · {j.scheduled_date}
            </div>
          </div>
        </Card>

        {error && (
          <Card className="border border-red-100 bg-red-50/50">
            <div className="text-sm text-danger">{error}</div>
          </Card>
        )}

        {/* Actions for the current state */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowOverride(true)}>
              Override…
            </Button>
          </CardHeader>
          <div className="grid grid-cols-2 gap-2">
            {j.state === "draft" && (
              <Button
                block
                disabled={busy}
                onClick={() => act(() => submitJobForCompliance(j.id) as any)}
              >
                <ShieldCheck className="h-4 w-4" /> Run compliance
              </Button>
            )}
            {j.state === "confirmed" && (
              <Button block disabled={busy} asChild>
                <Link to={`/jobs/${j.id}/assign`}>
                  <User className="h-4 w-4" /> Assign crew
                </Link>
              </Button>
            )}
            {j.state === "crew_assigned" && (
              <Button
                block
                disabled={busy}
                onClick={async () => {
                  if (pilot && drone)
                    await act(() => assignCrew(j.id, pilot.id, drone.id) as any);
                }}
              >
                <PlayCircle className="h-4 w-4" /> Mark in progress
              </Button>
            )}
            {j.state === "in_progress" && (
              <Button block disabled={busy} onClick={() => act(() => completeJob(j.id) as any)}>
                <CheckCircle2 className="h-4 w-4" /> Complete + reconcile
              </Button>
            )}
            {!["complete", "paid", "cancelled"].includes(j.state) && (
              <Button
                variant="outline"
                block
                disabled={busy}
                onClick={() =>
                  act(() => cancelJob(j.id, "Cancelled from job detail (no reason given)") as any)
                }
              >
                <XCircle className="h-4 w-4" /> Cancel job
              </Button>
            )}
          </div>
        </Card>

        {/* Farmer */}
        <Card>
          <div className="row">
            <IconTile tone="mint"><User className="h-5 w-5" /></IconTile>
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink-900">{farmer?.name}</div>
              <div className="text-xs text-ink-500">
                {farmer?.phone ?? "no phone"} · {farmer?.village ?? "—"}, {farmer?.state ?? "—"}
              </div>
            </div>
          </div>
        </Card>

        {/* Field */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardSubtitle>Crop</CardSubtitle>
            <div className="mt-1 flex items-center gap-2">
              <Wheat className="h-4 w-4 text-brand-700" />
              <span className="font-semibold capitalize text-ink-900">{j.crop}</span>
            </div>
          </Card>
          <Card>
            <CardSubtitle>Area</CardSubtitle>
            <div className="mt-1 font-semibold text-ink-900 tnum">{j.area_acres} ac</div>
          </Card>
          <Card>
            <CardSubtitle>Date</CardSubtitle>
            <div className="mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-700" />
              <span className="font-semibold text-ink-900">{j.scheduled_date}</span>
            </div>
          </Card>
          <Card>
            <CardSubtitle>Spray</CardSubtitle>
            <div className="mt-1 font-semibold text-ink-900">{j.spray_type ?? "—"}</div>
            <div className="text-[11px] text-ink-500 truncate">{j.pesticide_name ?? "no pesticide"}</div>
          </Card>
        </div>

        {/* Crew */}
        <Card>
          <CardHeader>
            <CardTitle>Crew</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            <Row icon={<User className="h-4 w-4" />} label="Pilot" value={pilot?.name ?? "Unassigned"} />
            <Row
              icon={<Plane className="h-4 w-4" />}
              label="Drone"
              value={drone ? `${drone.display_id} · ${drone.model}` : "Unassigned"}
            />
          </div>
        </Card>

        {/* Sorties */}
        <Card className="p-0">
          <div className="flex items-center justify-between px-4 pt-4">
            <CardTitle>Sorties ({sorties.data?.length ?? 0})</CardTitle>
          </div>
          <ul className="divide-y divide-ink-900/5 mt-2">
            {sorties.data?.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <IconTile tone={s.state === "active" ? "brand" : "neutral"} size="sm">
                  <Plane className="h-4 w-4" />
                </IconTile>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-900">Sortie {s.sortie_number}</span>
                    <Badge tone={s.state === "closed" ? "ok" : s.state === "active" ? "brand" : "neutral"}>
                      {s.state}
                    </Badge>
                  </div>
                  <div className="text-xs text-ink-500">
                    {s.takeoff_at ? new Date(s.takeoff_at).toLocaleTimeString() : "—"} →{" "}
                    {s.landing_at ? new Date(s.landing_at).toLocaleTimeString() : "in flight"}
                  </div>
                </div>
                <div className="text-right tnum text-xs text-ink-500">
                  {s.area_covered_acres ?? 0} ac
                </div>
              </li>
            ))}
            {(!sorties.data || sorties.data.length === 0) && (
              <li className="px-4 py-4 text-center text-xs text-ink-500">
                No sorties recorded yet.
              </li>
            )}
          </ul>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing snapshot</CardTitle>
            <IconTile tone="brand" size="sm"><Receipt className="h-4 w-4" /></IconTile>
          </CardHeader>
          {pricing ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-ink-500">Subtotal</span><span className="tnum">{inr(pricing.subtotal ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-ink-500">Tax</span><span className="tnum">{inr(pricing.tax ?? 0)}</span></div>
              <div className="flex justify-between border-t border-ink-900/5 pt-2 mt-2 font-semibold"><span>Total</span><span className="tnum">{inr(pricing.total ?? 0)}</span></div>
            </div>
          ) : (
            <p className="text-xs text-ink-500">No pricing locked yet — run compliance to generate.</p>
          )}
        </Card>

        {j.state === "comp_fail" && (
          <Card className="border border-amber-100 bg-amber-50/50">
            <div className="row">
              <IconTile tone="warn"><AlertTriangle className="h-5 w-5" /></IconTile>
              <div>
                <div className="text-sm font-semibold text-amber-900">Compliance failed</div>
                <p className="text-xs text-amber-700 mt-1">
                  Fix the issue (replace pesticide / renew RPC / assign different drone) or use Override above.
                </p>
              </div>
            </div>
          </Card>
        )}

        {j.override_reason && (
          <Card className="border border-amber-200">
            <div className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Last override</div>
            <p className="mt-1 text-sm text-ink-700">{j.override_reason}</p>
          </Card>
        )}
      </div>

      <OverrideModal
        open={showOverride}
        currentState={j.state}
        onClose={() => setShowOverride(false)}
        onSubmit={async (newState, reason) => {
          await act(async () => {
            const r = await overrideState(j.id, newState, reason);
            return { error: r.error as any };
          });
          setShowOverride(false);
        }}
      />
    </>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-xs text-ink-500">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium text-ink-900">{value}</div>
    </div>
  );
}
