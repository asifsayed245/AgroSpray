import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { User, Plane, CheckCircle2, AlertTriangle } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { assignCrew, getJob, listDrones, listPilots } from "@/data/queries";

export default function CrewAssign() {
  const { id } = useParams();
  const nav = useNavigate();
  const job = useSupabaseQuery(() => getJob(id!), [id]);
  const drones = useSupabaseQuery(listDrones, []);
  const pilots = useSupabaseQuery(listPilots, []);

  const [pilotId, setPilotId] = useState<string | null>(null);
  const [droneId, setDroneId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const j = job.data;
  const today = new Date();
  const eligiblePilots = (pilots.data ?? []).filter(
    (p) => p.employment_status === "active" && (!p.rpc_expiry || new Date(p.rpc_expiry) >= today),
  );
  const eligibleDrones = (drones.data ?? []).filter((d) => d.status === "ready");

  async function submit() {
    if (!pilotId || !droneId || !id) return;
    setBusy(true);
    setError(null);
    const { error: e } = await assignCrew(id, pilotId, droneId);
    setBusy(false);
    if (e) setError(e.message);
    else nav(`/jobs/${id}`);
  }

  if (job.loading) {
    return (
      <>
        <TopBar title="Assign crew" />
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

  if (j.state !== "confirmed") {
    return (
      <>
        <TopBar title="Assign crew" />
        <div className="page">
          <Card className="border border-amber-100 bg-amber-50/50">
            <div className="row">
              <IconTile tone="warn"><AlertTriangle className="h-5 w-5" /></IconTile>
              <div>
                <div className="text-sm font-semibold text-amber-900">
                  Job is in <span className="capitalize">{j.state.replace("_", " ")}</span> state
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  Crew can only be assigned to <strong>Confirmed</strong> jobs. Go back and run compliance first, or override to confirmed.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Assign crew" />
      <div className="page space-y-4">
        <Card className="bg-brand-gradient text-white p-5 shadow-pop">
          <Badge className="bg-white/15 text-white border border-white/20">{j.number}</Badge>
          <h1 className="mt-2 text-lg font-bold">{j.farmer?.name ?? "Walk-in"}</h1>
          <div className="text-sm text-white/90 mt-1">
            {j.crop} · {j.area_acres} acres · {j.scheduled_date}
          </div>
        </Card>

        {error && (
          <Card className="border border-red-100 bg-red-50/50">
            <div className="text-sm text-danger">{error}</div>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pick a pilot</CardTitle>
            <span className="text-xs text-ink-500">{eligiblePilots.length} eligible</span>
          </CardHeader>
          {eligiblePilots.length === 0 ? (
            <p className="text-xs text-ink-500">No pilots with valid RPC available.</p>
          ) : (
            <div className="space-y-2">
              {eligiblePilots.map((p) => {
                const selected = pilotId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPilotId(p.id)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      selected
                        ? "border-brand-600 bg-brand-50/40"
                        : "border-ink-900/5 hover:border-ink-900/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconTile tone={selected ? "brand" : "neutral"} size="sm">
                        <User className="h-4 w-4" />
                      </IconTile>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink-900">{p.name}</div>
                        <div className="text-[11px] text-ink-500">
                          {p.rpc_number} · expires {p.rpc_expiry ?? "—"}
                        </div>
                      </div>
                      {selected && <CheckCircle2 className="h-5 w-5 text-brand-700" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pick a drone</CardTitle>
            <span className="text-xs text-ink-500">{eligibleDrones.length} ready</span>
          </CardHeader>
          {eligibleDrones.length === 0 ? (
            <p className="text-xs text-ink-500">No drones in ready state. Check the fleet.</p>
          ) : (
            <div className="space-y-2">
              {eligibleDrones.map((d) => {
                const selected = droneId === d.id;
                const dueService =
                  (d.hours_since_service ?? 0) >= (d.service_threshold_hours ?? 50) * 0.9;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDroneId(d.id)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      selected
                        ? "border-brand-600 bg-brand-50/40"
                        : "border-ink-900/5 hover:border-ink-900/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <IconTile tone={selected ? "brand" : "neutral"} size="sm">
                        <Plane className="h-4 w-4" />
                      </IconTile>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink-900">
                            {d.display_id}
                          </span>
                          {dueService && (
                            <Badge tone="warn">Service due soon</Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-ink-500">
                          {d.manufacturer} {d.model} · {d.payload_l ?? "—"} L payload
                        </div>
                      </div>
                      {selected && <CheckCircle2 className="h-5 w-5 text-brand-700" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" block onClick={() => nav(`/jobs/${id}`)} disabled={busy}>
            Cancel
          </Button>
          <Button
            block
            disabled={!pilotId || !droneId || busy}
            onClick={submit}
          >
            <CheckCircle2 className="h-4 w-4" /> Assign
          </Button>
        </div>

        <CardSubtitle className="text-center text-ink-500">
          Assignment moves the job to <strong>Crew assigned</strong>. Start a sortie from the job page.
        </CardSubtitle>
      </div>
    </>
  );
}
