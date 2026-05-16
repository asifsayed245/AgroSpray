import { useMemo, useState } from "react";
import { CalendarRange, Plus, Minus, Ban, Clock, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import {
  listSlots,
  listSlotBlocks,
  createSlotBlock,
  deleteSlotBlock,
  getTenant,
  type SlotBlock,
} from "@/data/queries";
import { supabase } from "@/lib/supabase";

export default function Slots() {
  const [busy, setBusy] = useState(false);
  const [blockingDate, setBlockingDate] = useState<string | null>(null);
  const [blockStart, setBlockStart] = useState("14:00");
  const [blockEnd, setBlockEnd] = useState("16:00");
  const [blockReason, setBlockReason] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);

  const range = useMemo(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 13 * 86400e3);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, []);
  const slots = useSupabaseQuery(() => listSlots(range.from, range.to), [range.from, range.to]);
  const blocks = useSupabaseQuery(() => listSlotBlocks(range.from, range.to), [range.from, range.to]);
  const tenantQ = useSupabaseQuery(getTenant, []);
  const tenantId = (tenantQ.data as { id?: string } | null)?.id;

  const blocksByDate = useMemo(() => {
    const map: Record<string, SlotBlock[]> = {};
    for (const b of (blocks.data ?? []) as SlotBlock[]) {
      (map[b.date] ??= []).push(b);
    }
    return map;
  }, [blocks.data]);

  async function bumpCapacity(slotId: string, delta: number, current: number) {
    setBusy(true);
    await supabase.from("slots").update({ capacity: Math.max(0, current + delta) }).eq("id", slotId);
    setBusy(false);
    slots.refresh();
  }

  async function toggleUnavailable(slotId: string, current: boolean) {
    setBusy(true);
    await supabase.from("slots").update({ unavailable: !current }).eq("id", slotId);
    setBusy(false);
    slots.refresh();
  }

  function openBlockForm(date: string) {
    setBlockingDate(date);
    setBlockStart("14:00");
    setBlockEnd("16:00");
    setBlockReason("");
    setBlockError(null);
  }

  async function saveBlock() {
    if (!blockingDate || !tenantId) return;
    if (blockEnd <= blockStart) {
      setBlockError("End time must be after start time.");
      return;
    }
    setBusy(true);
    setBlockError(null);
    const { error } = await createSlotBlock({
      date: blockingDate,
      time_start: blockStart,
      time_end: blockEnd,
      reason: blockReason || undefined,
      tenant_id: tenantId,
    });
    setBusy(false);
    if (error) {
      setBlockError(error.message);
      return;
    }
    setBlockingDate(null);
    blocks.refresh();
  }

  async function removeBlock(id: string) {
    setBusy(true);
    await deleteSlotBlock(id);
    setBusy(false);
    blocks.refresh();
  }

  return (
    <>
      <TopBar title="Slot manager" />
      <div className="page space-y-3">
        <Card className="bg-brand-soft border-0">
          <div className="row">
            <CalendarRange className="h-5 w-5 text-brand-700" />
            <div>
              <div className="text-sm font-semibold text-ink-900">Daily capacity & blocks</div>
              <div className="text-xs text-ink-700">
                Daily capacity caps total bookings. Block specific time windows for maintenance, breaks, etc.
              </div>
            </div>
          </div>
        </Card>

        {slots.loading && <Card>Loading…</Card>}
        {slots.data?.map((s) => {
          const pct = s.capacity > 0 ? Math.round((s.booked / s.capacity) * 100) : 0;
          const dayBlocks = blocksByDate[s.date] ?? [];
          const editing = blockingDate === s.date;
          return (
            <Card key={s.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-ink-900">
                    {new Date(s.date).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}
                  </div>
                  <div className="text-xs text-ink-500 tnum">
                    {s.booked} / {s.capacity} booked
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label="Decrease capacity"
                    onClick={() => bumpCapacity(s.id, -1, s.capacity)}
                    disabled={busy || s.capacity <= 0}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink-700 disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <button
                    aria-label="Increase capacity"
                    onClick={() => bumpCapacity(s.id, +1, s.capacity)}
                    disabled={busy}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-white"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <Progress className="mt-3" value={pct} />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-ink-500 tnum">{pct}% utilised</span>
                <Button
                  variant={s.unavailable ? "danger" : "ghost"}
                  size="sm"
                  onClick={() => toggleUnavailable(s.id, s.unavailable)}
                  disabled={busy}
                >
                  <Ban className="h-3.5 w-3.5" /> {s.unavailable ? "Unavailable" : "Available"}
                </Button>
              </div>
              {s.notes && <p className="mt-2 text-[11px] text-ink-500">{s.notes}</p>}

              {(dayBlocks.length > 0 || editing) && <hr className="my-3 border-ink-900/5" />}

              {dayBlocks.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] uppercase tracking-wide text-ink-500 font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Blocked windows
                  </div>
                  {dayBlocks.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between rounded-lg bg-amber-50/60 border border-amber-100 px-2 py-1.5 text-xs"
                    >
                      <div>
                        <span className="font-medium tnum text-amber-900">
                          {b.time_start.slice(0, 5)} – {b.time_end.slice(0, 5)}
                        </span>
                        {b.reason && <span className="text-amber-700 ml-2">· {b.reason}</span>}
                      </div>
                      <button
                        onClick={() => removeBlock(b.id)}
                        disabled={busy}
                        className="text-amber-700 hover:text-danger"
                        aria-label="Delete block"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {editing ? (
                <div className="mt-3 rounded-xl border border-ink-900/5 bg-canvas p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-wide text-ink-500 font-semibold">
                    Block a window on {new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Start" type="time" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} />
                    <Input label="End" type="time" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} />
                  </div>
                  <Input
                    label="Reason (optional)"
                    placeholder="Drone maintenance, crew off, etc."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                  />
                  {blockError && (
                    <div className="rounded-lg bg-red-50 border border-red-100 px-2 py-1 text-[11px] text-danger">
                      {blockError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="outline" block onClick={() => setBlockingDate(null)} disabled={busy}>
                      Cancel
                    </Button>
                    <Button size="sm" block onClick={saveBlock} disabled={busy}>
                      {busy ? "Saving…" : "Block this window"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  onClick={() => openBlockForm(s.date)}
                  disabled={busy}
                >
                  <Clock className="h-3.5 w-3.5" /> Block a window
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
