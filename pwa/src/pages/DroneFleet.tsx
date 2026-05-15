import { Link } from "react-router-dom";
import { Plane, Plug, ChevronRight, Wrench } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { PrimaryStatCard } from "@/components/layout/PrimaryStatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { Sparkline } from "@/components/ui/sparkline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { drones, summary } from "@/data/mock";
import type { Drone, DroneStatus } from "@/data/types";

const statusTone: Record<DroneStatus, Parameters<typeof Badge>[0]["tone"]> = {
  Ready: "ok",
  "In flight": "brand",
  Maintenance: "warn",
  "Out of service": "danger",
};

export default function DroneFleet() {
  const totalHours = drones.reduce((s, d) => s + d.hoursFlown, 0);
  return (
    <>
      <TopBar title="Drone fleet" unread={summary.unreadAlerts} />
      <div className="page space-y-4">
        <PrimaryStatCard
          label="Fleet"
          primary={`${drones.length} drones`}
          caption={`${totalHours} lifetime flight hours`}
        />

        <Tabs defaultValue="drones">
          <TabsList>
            <TabsTrigger value="drones">Drones</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="drones" className="space-y-3">
            {drones.map((d) => (
              <DroneRow key={d.id} drone={d} />
            ))}
          </TabsContent>

          <TabsContent value="integrations" className="space-y-3">
            <IntegrationCard
              name="DJI FlightHub"
              status="Not connected"
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

function DroneRow({ drone }: { drone: Drone }) {
  const serviceWarn = drone.serviceDueIn <= 10;
  return (
    <Link to={`/fleet/${drone.id}`}>
      <Card className="transition-shadow hover:shadow-pop">
        <div className="row">
          <IconTile tone="brand" size="lg">
            <Plane className="h-6 w-6" />
          </IconTile>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink-900">{drone.model}</span>
              <Badge tone={statusTone[drone.status]}>{drone.status}</Badge>
            </div>
            <div className="truncate text-xs text-ink-500">
              {drone.id} · {drone.uin}
            </div>
          </div>
          <div className="text-right">
            <Sparkline values={drone.recentDailyHours} />
            <div className="tnum text-[11px] text-ink-500 mt-0.5">7d hrs</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Hours" value={drone.hoursFlown.toString()} />
          <Stat label="Payload" value={`${drone.payloadL} L`} />
          <Stat
            label={serviceWarn ? "Service due" : "Service in"}
            value={serviceWarn ? "Now" : `${drone.serviceDueIn}h`}
            tone={serviceWarn ? "warn" : "default"}
          />
        </div>

        {drone.currentJob && (
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-brand-soft px-3 py-2 text-xs">
            <span className="text-brand-800 font-medium">Currently on {drone.currentJob}</span>
            <ChevronRight className="h-4 w-4 text-brand-700" />
          </div>
        )}
      </Card>
    </Link>
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
