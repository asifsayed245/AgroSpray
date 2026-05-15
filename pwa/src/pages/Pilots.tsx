import { Link } from "react-router-dom";
import { User, Phone, ShieldCheck, AlertTriangle, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { Button } from "@/components/ui/button";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { listPilots } from "@/data/queries";

export default function Pilots() {
  const { data, loading } = useSupabaseQuery(listPilots);
  const pilots = data ?? [];
  const today = new Date();
  const soon = new Date(today.getTime() + 30 * 86400e3);

  return (
    <>
      <TopBar title="Pilots" />
      <div className="page space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Roster ({pilots.length})</h2>
          <Button asChild size="sm">
            <Link to="/pilots/new">Add pilot</Link>
          </Button>
        </div>

        {loading && <Card>Loading…</Card>}
        {!loading && pilots.map((p) => {
          const expiresAt = p.rpc_expiry ? new Date(p.rpc_expiry) : null;
          const expired = expiresAt && expiresAt < today;
          const expiringSoon = expiresAt && !expired && expiresAt < soon;
          return (
            <Card key={p.id}>
              <div className="row">
                <IconTile tone={expired ? "danger" : expiringSoon ? "warn" : "brand"} size="lg">
                  <User className="h-6 w-6" />
                </IconTile>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-900">{p.name}</span>
                    <Badge tone={expired ? "danger" : expiringSoon ? "warn" : "ok"}>
                      {expired ? "RPC expired" : expiringSoon ? "Expires soon" : "RPC valid"}
                    </Badge>
                  </div>
                  <div className="text-xs text-ink-500 truncate">
                    {p.rpc_number} · expires {p.rpc_expiry ?? "—"}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-500">
                    <Phone className="h-3 w-3" /> {p.phone ?? "—"}
                    {p.telegram_id && <span>· {p.telegram_id}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-400" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                {(p.certified_drone_classes ?? []).map((c) => (
                  <span key={c} className="pill bg-canvas text-ink-700 capitalize">
                    <ShieldCheck className="h-3 w-3" /> {c}
                  </span>
                ))}
                {(p.certified_drone_classes ?? []).length === 0 && (
                  <span className="pill bg-amber-50 text-amber-700">
                    <AlertTriangle className="h-3 w-3" /> No drone class set
                  </span>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
