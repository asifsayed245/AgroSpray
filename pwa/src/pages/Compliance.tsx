import { useState } from "react";
import { AlertCircle, CheckCircle2, ShieldCheck, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { StatArc } from "@/components/ui/stat-arc";
import { complianceBlocks, summary } from "@/data/mock";
import type { ComplianceBlock } from "@/data/types";

export default function Compliance() {
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const open = complianceBlocks.filter((b) => !resolved.has(b.jobId));

  return (
    <>
      <TopBar title="Compliance" unread={summary.unreadAlerts} />
      <div className="page space-y-4">
        <Card className="flex flex-col items-center p-5">
          <div className="text-xs uppercase tracking-wide text-ink-500">Health score</div>
          <StatArc value={summary.complianceScore} label="Your score" />
          <div className="mt-2 flex items-center gap-2 text-xs text-ink-500">
            <ShieldCheck className="h-4 w-4 text-brand-700" />
            DGCA · CIB · NPNT all evaluated per job
          </div>
        </Card>

        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-ink-900">
            Blocked bookings <span className="text-ink-500">({open.length})</span>
          </h2>
          <Button variant="ghost" size="sm">
            Filters
          </Button>
        </div>

        <ul className="space-y-3">
          {open.map((b) => (
            <BlockRow
              key={b.jobId}
              block={b}
              onOverride={() => setResolved((s) => new Set(s).add(b.jobId))}
            />
          ))}
          {open.length === 0 && (
            <Card className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <CheckCircle2 className="h-8 w-8 text-ok" />
              <div className="text-sm font-semibold text-ink-900">All clear</div>
              <div className="text-xs text-ink-500">No bookings are currently blocked.</div>
            </Card>
          )}
        </ul>
      </div>
    </>
  );
}

function BlockRow({ block, onOverride }: { block: ComplianceBlock; onOverride: () => void }) {
  const tone = block.severity === "high" ? "danger" : block.severity === "medium" ? "warn" : "brand";
  const badgeTone = block.severity === "high" ? "danger" : block.severity === "medium" ? "warn" : "info";
  return (
    <Card>
      <div className="row">
        <IconTile tone={tone}>
          <AlertCircle className="h-5 w-5" />
        </IconTile>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-ink-900">{block.check}</span>
            <Badge tone={badgeTone}>{block.severity}</Badge>
          </div>
          <div className="text-xs text-ink-500 truncate">
            {block.jobNumber} · {block.farmer} · {block.village}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-ink-400" />
      </div>
      <p className="mt-3 rounded-2xl bg-canvas px-3 py-2 text-xs text-ink-700">{block.reason}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" block>
          Fix issue
        </Button>
        <Button variant="primary" size="sm" block onClick={onOverride}>
          Override
        </Button>
      </div>
    </Card>
  );
}
