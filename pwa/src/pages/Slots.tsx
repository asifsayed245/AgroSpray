import { useMemo, useState } from "react";
import { CalendarRange, Plus, Minus, Ban } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { listSlots } from "@/data/queries";
import { supabase } from "@/lib/supabase";

export default function Slots() {
  const [busy, setBusy] = useState(false);
  const range = useMemo(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 13 * 86400e3);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, []);
  const slots = useSupabaseQuery(() => listSlots(range.from, range.to), [range.from, range.to]);

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

  return (
    <>
      <TopBar title="Slot manager" />
      <div className="page space-y-3">
        <Card className="bg-brand-soft border-0">
          <div className="row">
            <CalendarRange className="h-5 w-5 text-brand-700" />
            <div>
              <div className="text-sm font-semibold text-ink-900">Daily capacity</div>
              <div className="text-xs text-ink-700">
                Capacity = operational pilots × drones × shifts. Bump per day if you have an extra crew.
              </div>
            </div>
          </div>
        </Card>

        {slots.loading && <Card>Loading…</Card>}
        {slots.data?.map((s) => {
          const pct = s.capacity > 0 ? Math.round((s.booked / s.capacity) * 100) : 0;
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
            </Card>
          );
        })}
      </div>
    </>
  );
}
