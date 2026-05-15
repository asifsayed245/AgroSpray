import { useMemo, useState } from "react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Languages,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import {
  closeQuery,
  listFarmerQueries,
  replyToQuery,
  type FarmerQueryRow,
} from "@/data/queries";

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  replying: "Replying",
  replied: "Replied",
  closed: "Closed",
};
const STATUS_TONE: Record<string, "warn" | "brand" | "ok" | "neutral"> = {
  open: "warn",
  replying: "brand",
  replied: "ok",
  closed: "neutral",
};
const LANG_LABEL: Record<string, string> = { en: "English", hi: "हिन्दी", mr: "मराठी" };

function slaInfo(openedAt: string, dueAt: string, status: string) {
  const now = Date.now();
  const due = new Date(dueAt).getTime();
  const remaining = due - now;
  if (status === "replied" || status === "closed") {
    const opened = new Date(openedAt).getTime();
    const replied = now; // approx — used as "resolved" marker
    const mins = Math.max(0, Math.round((replied - opened) / 60000));
    return { tone: "ok" as const, text: `resolved · took ~${mins}m`, overdue: false };
  }
  if (remaining <= 0) {
    const overdueMins = Math.round(-remaining / 60000);
    return { tone: "danger" as const, text: `${overdueMins}m overdue`, overdue: true };
  }
  const mins = Math.round(remaining / 60000);
  const tone = mins < 30 ? "warn" : "ok";
  return { tone: tone as "warn" | "ok", text: `due in ${mins}m`, overdue: false };
}

export default function Queries() {
  const [tab, setTab] = useState("open");
  const filter = tab === "open"
    ? ["open", "replying"]
    : tab === "replied"
      ? ["replied"]
      : tab === "closed"
        ? ["closed"]
        : undefined;
  const q = useSupabaseQuery(() => listFarmerQueries(filter), [tab]);

  const items = (q.data ?? []) as FarmerQueryRow[];
  const counts = useMemo(() => {
    return items.reduce<Record<string, number>>((acc, it) => {
      acc[it.status] = (acc[it.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [items]);

  return (
    <>
      <TopBar title="Queries" />
      <div className="page space-y-3">
        <Card className="bg-brand-gradient text-white p-5 shadow-pop">
          <MessageSquare className="h-5 w-5 mb-2 opacity-80" />
          <h1 className="text-lg font-bold">Farmer queries</h1>
          <div className="text-sm text-white/90 mt-1">
            Free-form questions from Telegram. Reply here; the bot delivers your message back to the farmer.
          </div>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="replied">Replied</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="space-y-3">
            <Counts items={items} counts={counts} loading={q.loading} />
            <List items={items} loading={q.loading} onRefresh={q.refresh} />
          </TabsContent>
          <TabsContent value="replied" className="space-y-3">
            <List items={items} loading={q.loading} onRefresh={q.refresh} />
          </TabsContent>
          <TabsContent value="closed" className="space-y-3">
            <List items={items} loading={q.loading} onRefresh={q.refresh} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function Counts({
  items,
  counts,
  loading,
}: {
  items: FarmerQueryRow[];
  counts: Record<string, number>;
  loading: boolean;
}) {
  if (loading) return null;
  const overdue = items.filter((it) => {
    const info = slaInfo(it.opened_at, it.sla_due_at, it.status);
    return info.overdue;
  }).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>This filter</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-canvas py-2">
          <div className="text-lg font-bold tnum text-ink-900">{counts.open ?? 0}</div>
          <div className="text-[11px] text-ink-500">Open</div>
        </div>
        <div className="rounded-xl bg-canvas py-2">
          <div className="text-lg font-bold tnum text-ink-900">{counts.replying ?? 0}</div>
          <div className="text-[11px] text-ink-500">Replying</div>
        </div>
        <div className="rounded-xl bg-canvas py-2">
          <div className="text-lg font-bold tnum text-danger">{overdue}</div>
          <div className="text-[11px] text-ink-500">Overdue</div>
        </div>
      </div>
    </Card>
  );
}

function List({
  items,
  loading,
  onRefresh,
}: {
  items: FarmerQueryRow[];
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) return <Card>Loading…</Card>;
  if (items.length === 0) {
    return (
      <Card>
        <p className="text-xs text-ink-500 text-center py-3">
          No queries to show in this tab. They'll appear here as farmers ask questions via Telegram.
        </p>
      </Card>
    );
  }
  return (
    <>
      {items.map((it) => (
        <QueryCard key={it.id} item={it} onRefresh={onRefresh} />
      ))}
    </>
  );
}

function QueryCard({ item, onRefresh }: { item: FarmerQueryRow; onRefresh: () => void }) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReplyBox, setShowReplyBox] = useState(false);

  const sla = slaInfo(item.opened_at, item.sla_due_at, item.status);
  const farmerName = item.farmer?.name ?? item.username ?? "Telegram user";
  const farmerPhone = item.farmer?.phone;
  const farmerVillage = item.farmer?.village;

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    setError(null);
    const { error: e } = await replyToQuery(item.id, reply.trim());
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    setReply("");
    setShowReplyBox(false);
    onRefresh();
  }

  async function close() {
    setBusy(true);
    setError(null);
    const { error: e } = await closeQuery(item.id);
    setBusy(false);
    if (e) setError(e.message);
    else onRefresh();
  }

  const canReply = item.status === "open" || item.status === "replying";
  const canClose = item.status === "replied" || item.status === "open" || item.status === "replying";

  return (
    <Card>
      <div className="row">
        <IconTile tone={sla.tone === "danger" ? "danger" : sla.tone === "warn" ? "warn" : "brand"} size="lg">
          <MessageSquare className="h-5 w-5" />
        </IconTile>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ink-900 truncate">{farmerName}</span>
            <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>
              {STATUS_LABEL[item.status] ?? item.status}
            </Badge>
            <span className="pill bg-canvas text-ink-700 text-[10px]">
              <Languages className="h-3 w-3" /> {LANG_LABEL[item.language] ?? item.language}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-ink-500 mt-0.5">
            {farmerPhone && (
              <>
                <Phone className="h-3 w-3" /> {farmerPhone}
              </>
            )}
            {farmerVillage && (
              <>
                <MapPin className="h-3 w-3" /> {farmerVillage}
              </>
            )}
            <Clock className="h-3 w-3 ml-1" />
            <span className={sla.tone === "danger" ? "text-danger" : ""}>{sla.text}</span>
            {item.context_state && (
              <span className="pill bg-canvas text-ink-500 text-[10px]">{item.context_state}</span>
            )}
          </div>
        </div>
      </div>

      <blockquote className="mt-3 border-l-2 border-brand-200 pl-3 text-sm text-ink-800 italic whitespace-pre-wrap">
        {item.inbound_text}
      </blockquote>

      {item.reply_text && (
        <div className="mt-3 rounded-xl bg-brand-50/60 px-3 py-2 text-sm text-brand-900 whitespace-pre-wrap">
          <div className="text-[10px] uppercase tracking-wide text-brand-700 font-semibold mb-1">
            Ops reply
            {item.replied_at && (
              <span className="ml-2 text-ink-500">
                · {new Date(item.replied_at).toLocaleString()}
              </span>
            )}
          </div>
          {item.reply_text}
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}

      {canReply && !showReplyBox && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" block onClick={() => setShowReplyBox(true)}>
            <Send className="h-4 w-4" /> Reply
          </Button>
          {canClose && (
            <Button size="sm" variant="outline" block disabled={busy} onClick={close}>
              <CheckCircle2 className="h-4 w-4" /> Mark closed
            </Button>
          )}
        </div>
      )}

      {showReplyBox && (
        <div className="mt-3 space-y-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={4}
            placeholder={`Type your reply in ${LANG_LABEL[item.language] ?? "the farmer's language"}…`}
            className="w-full rounded-xl border border-ink-900/10 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:border-brand-600"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" block disabled={busy} onClick={() => { setShowReplyBox(false); setReply(""); }}>
              Cancel
            </Button>
            <Button size="sm" block disabled={busy || !reply.trim()} onClick={send}>
              <Send className="h-4 w-4" /> {busy ? "Sending…" : "Send via bot"}
            </Button>
          </div>
        </div>
      )}

      {item.status === "replied" && !showReplyBox && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" block onClick={() => setShowReplyBox(true)}>
            <Send className="h-4 w-4" /> Reply again
          </Button>
          <Button size="sm" block disabled={busy} onClick={close}>
            <CheckCircle2 className="h-4 w-4" /> Mark closed
          </Button>
        </div>
      )}
    </Card>
  );
}
