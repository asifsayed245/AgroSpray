import { Plane, Plug, Wrench, AlertTriangle } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PrimaryStatCard } from "@/components/layout/PrimaryStatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { listDrones } from "@/data/queries";
import type { Database } from "@/data/db.types";

type DroneStatus = Database["public"]["Enums"]["drone_status"];

const STATUS_TONE: Record<DroneStatus, "ok" | "warn" | "brand" | "danger"> = {
  ready: "ok",
  in_flight: "brand",
  maintenance: "warn",
  out_of_service: "danger",
};

const STATUS_LABEL: Record<DroneStatus, string> = {
  ready: "Ready",
  in_flight: "In flight",
  maintenance: "Maintenance",
  out_of_service: "Out of service",
};

type DroneRow = {
  id: string;
  display_id: string;
  uin: string;
  manufacturer: string | null;
  model: string | null;
  payload_l: number | null;
  hours_flown: number | null;
  hours_since_service: number | null;
  service_threshold_hours: number | null;
  insurance_expiry: string | null;
  status: DroneStatus;
};

export default function DroneFleet() {
  const { data, loading } = useSupabaseQuery(listDrones, []);
  const drones = (data ?? []) as DroneRow[];

  const totalHours = drones.reduce((s, d) => s + Number(d.hours_flown ?? 0), 0);
  const today = new Date();
  const soon = new Date(today.getTime() + 30 * 86400e3);

  const needingService = drones.filter(
    (d) => Number(d.hours_since_service ?? 0) >= Number(d.service_threshold_hours ?? 50),
  );
  const dueSoon = drones.filter((d) => {
    const ratio =
      Number(d.hours_since_service ?? 0) / Math.max(1, Number(d.service_threshold_hours ?? 50));
    return ratio >= 0.85 && ratio < 1;
  });
  const insuranceExpiring = drones.filter((d) => {
    if (!d.insurance_expiry) return true;
    const exp = new Date(d.insurance_expiry);
    return exp < soon;
  });

  return (
    <>
      <TopBar title="Drone fleet" />
      <div className="page space-y-4">
        <PrimaryStatCard
          label="Fleet"
          primary={`${drones.length} drones`}
          caption={`${totalHours.toFixed(0)} lifetime flight hours`}
        />

        <Tabs defaultValue="drones">
          <TabsList>
            <TabsTrigger value="drones">Drones</TabsTrigger>
            <TabsTrigger value="maintenance">
              Maintenance{" "}
              {needingService.length + dueSoon.length > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-[10px] px-1">
                  {needingService.length + dueSoon.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="drones" className="space-y-3">
            {loading && <Card>Loading…</Card>}
            {!loading && drones.length === 0 && (
              <Card><p className="text-xs text-ink-500 text-center py-3">No drones yet.</p></Card>
            )}
            {drones.map((d) => (
              <DroneRow key={d.id} drone={d} />
            ))}
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-3">
            {needingService.length === 0 && dueSoon.length === 0 && insuranceExpiring.length === 0 && (
              <Card>
                <p className="text-xs text-ink-500 text-center py-3">
                  All drones are within service thresholds and insurance is valid.
                </p>
              </Card>
            )}

            {needingService.length > 0 && (
              <Card>
                <div className="row">
                  <IconTile tone="danger"><Wrench className="h-5 w-5" /></IconTile>
                  <div>
                    <div className="text-sm font-semibold text-ink-900">Service overdue</div>
                    <div className="text-xs text-ink-500">{needingService.length} drone(s) past threshold</div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {needingService.map((d) => (
                    <ServiceRow key={d.id} drone={d} />
                  ))}
                </div>
              </Card>
            )}

            {dueSoon.length > 0 && (
              <Card>
                <div className="row">
                  <IconTile tone="warn"><Wrench className="h-5 w-5" /></IconTile>
                  <div>
                    <div className="text-sm font-semibold text-ink-900">Service due soon</div>
                    <div className="text-xs text-ink-500">{dueSoon.length} drone(s) ≥85% of threshold</div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {dueSoon.map((d) => (
                    <ServiceRow key={d.id} drone={d} />
                  ))}
                </div>
              </Card>
            )}

            {insuranceExpiring.length > 0 && (
              <Card>
                <div className="row">
                  <IconTile tone="warn"><AlertTriangle className="h-5 w-5" /></IconTile>
                  <div>
                    <div className="text-sm font-semibold text-ink-900">Insurance expiring</div>
                    <div className="text-xs text-ink-500">{insuranceExpiring.length} drone(s) within 30 days</div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {insuranceExpiring.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ink-900">{d.display_id}</span>
                      <span className="text-amber-700">Expires {d.insurance_expiry ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="integrations" className="space-y-3">
            <IntegrationCard
              name="DJI FlightHub"
              status="Not connected (stub)"
              description="Connect to stream telemetry from your DJI Agras fleet. Required for anti-fraud reconciliation."
              cta="Connect"
            />
            <IntegrationCard
              name="XAG Cloud"
              status="Coming soon"
              description="Native ingestion for XAG P-series. Fall back to SD-card upload for now."
              cta="Notify me"
              disabled
            />
            <IntegrationCard
              name="Garuda Kisan"
              status="Coming soon"
              description="Native ingestion for Garuda. SD-card upload supported in the meantime."
              cta="Notify me"
              disabled
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function DroneRow({ drone }: { drone: DroneRow }) {
  const hoursSince = Number(drone.hours_since_service ?? 0);
  const threshold = Number(drone.service_threshold_hours ?? 50);
  const ratio = threshold > 0 ? hoursSince / threshold : 0;
  const serviceWarn = ratio >= 0.85;
  return (
    <Card>
      <div className="row">
        <IconTile tone="brand" size="lg">
          <Plane className="h-6 w-6" />
        </IconTile>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-900">{drone.display_id}</span>
            <Badge tone={STATUS_TONE[drone.status]}>{STATUS_LABEL[drone.status]}</Badge>
          </div>
          <div className="truncate text-xs text-ink-500">
            {drone.manufacturer} {drone.model} · {drone.uin}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Hours" value={Number(drone.hours_flown ?? 0).toFixed(0)} />
        <Stat label="Payload" value={`${drone.payload_l ?? "—"} L`} />
        <Stat
          label={serviceWarn ? "Service due" : "Since service"}
          value={`${hoursSince.toFixed(0)}/${threshold.toFixed(0)}h`}
          tone={serviceWarn ? "warn" : "default"}
        />
      </div>
    </Card>
  );
}

function ServiceRow({ drone }: { drone: DroneRow }) {
  const hoursSince = Number(drone.hours_since_service ?? 0);
  const threshold = Number(drone.service_threshold_hours ?? 50);
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="font-medium text-ink-900">{drone.display_id}</span>
      <span className="tnum text-ink-500">
        {hoursSince.toFixed(0)} / {threshold.toFixed(0)} h
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-2xl bg-canvas py-2">
      <div className={`tnum text-sm font-semibold ${tone === "warn" ? "text-amber-700" : "text-ink-900"}`}>
        {value}
      </div>
      <div className="text-[11px] text-ink-500">{label}</div>
    </div>
  );
}

function IntegrationCard({
  name,
  status,
  description,
  cta,
  disabled,
}: {
  name: string;
  status: string;
  description: string;
  cta: string;
  disabled?: boolean;
}) {
  return (
    <Card>
      <div className="row">
        <IconTile tone="brand" size="lg">
          {disabled ? <Wrench className="h-6 w-6" /> : <Plug className="h-6 w-6" />}
        </IconTile>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink-900">{name}</div>
          <div className="text-xs text-ink-500">{status}</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-700">{description}</p>
      <Button block size="md" variant={disabled ? "soft" : "primary"} className="mt-3" disabled={disabled}>
        {cta}
      </Button>
    </Card>
  );
}
