import { useState } from "react";
import { ScrollText, Hash, User as UserIcon, ShieldAlert, Bot } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { listAuditEvents } from "@/data/queries";

const SOURCE_FILTERS = ["all", "auto", "manual", "override"] as const;

export default function AuditLog() {
  const [source, setSource] = useState<(typeof SOURCE_FILTERS)[number]>("all");
  const { data, loading } = useSupabaseQuery(
    () => listAuditEvents({ limit: 200, source: source === "all" ? undefined : source }),
    [source],
  );
  const events = data ?? [];

  return (
    <>
      <TopBar title="Audit log" />
      <div className="page space-y-3">
        <Card className="bg-brand-soft border-0">
          <div className="row">
            <IconTile tone="brand"><ScrollText className="h-5 w-5" /></IconTile>
            <div>
              <div className="text-sm font-semibold text-ink-900">Append-only, hash-chained</div>
              <div className="text-xs text-ink-700">
                Every event references the previous one. Tamper-evident per PRD §6.9.1.
              </div>
            </div>
          </div>
        </Card>

        <div className="flex gap-2">
          {SOURCE_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`pill border capitalize ${
                source === s ? "bg-brand-700 text-white border-brand-700" : "bg-white text-ink-700 border-ink-900/8"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading && <Card>Loading…</Card>}
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id}>
              <Card>
                <div className="row">
                  <IconTile
                    tone={
                      e.source === "override"
                        ? "warn"
                        : e.source === "manual"
                        ? "brand"
                        : "neutral"
                    }
                    size="sm"
                  >
                    {e.source === "override" ? (
                      <ShieldAlert className="h-4 w-4" />
                    ) : e.source === "manual" ? (
                      <UserIcon className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </IconTile>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-ink-900">{e.event_type}</span>
                      <Badge
                        tone={e.source === "override" ? "warn" : e.source === "manual" ? "info" : "neutral"}
                      >
                        {e.source}
                      </Badge>
                    </div>
                    <div className="text-xs text-ink-500 truncate">
                      {e.entity_type} · {new Date(e.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                {e.payload && Object.keys(e.payload as object).length > 0 && (
                  <pre className="mt-2 max-h-32 overflow-auto rounded-2xl bg-canvas p-2 text-[11px] text-ink-700">
{JSON.stringify(e.payload, null, 2)}
                  </pre>
                )}
                <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-ink-400">
                  <Hash className="h-3 w-3" />
                  <span className="truncate" title={e.hash}>{(e.hash as string).slice(0, 16)}…</span>
                </div>
              </Card>
            </li>
          ))}
          {!loading && events.length === 0 && (
            <Card className="text-center py-8 text-sm text-ink-500">No events match this filter.</Card>
          )}
        </ul>
      </div>
    </>
  );
}
