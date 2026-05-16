import { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  checkWindowsConflict,
  confirmInquiry,
  sendInquiryConfirmation,
  type JobWindowSpec,
  type WindowsConflict,
} from "@/data/queries";

type Props = {
  jobId: string;
  jobNumber: string;
  tenantId: string;
  scheduledDate: string;
  scheduledDateEnd: string | null;
  defaultStart?: string;
  defaultEnd?: string;
  workingHours?: { start: string; end: string };
  onClose: () => void;
  onConfirmed: () => void;
};

function datesInRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(startISO + "T00:00:00");
  const end = new Date(endISO + "T00:00:00");
  if (end < start) return [startISO];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function ConfirmInquiryModal({
  jobId,
  jobNumber,
  tenantId,
  scheduledDate,
  scheduledDateEnd,
  defaultStart = "08:00",
  defaultEnd = "12:00",
  workingHours,
  onClose,
  onConfirmed,
}: Props) {
  const [dateEnd, setDateEnd] = useState(scheduledDateEnd ?? scheduledDate);
  const [windows, setWindows] = useState<JobWindowSpec[]>(() =>
    datesInRange(scheduledDate, scheduledDateEnd ?? scheduledDate).map((d) => ({
      date: d,
      time_start: defaultStart,
      time_end: defaultEnd,
    })),
  );
  const [check, setCheck] = useState<WindowsConflict | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rebuild windows whenever dateEnd changes, preserving existing entries.
  useEffect(() => {
    const dates = datesInRange(scheduledDate, dateEnd);
    setWindows((prev) => {
      const byDate = new Map(prev.map((w) => [w.date, w]));
      return dates.map(
        (d) => byDate.get(d) ?? { date: d, time_start: defaultStart, time_end: defaultEnd },
      );
    });
  }, [scheduledDate, dateEnd, defaultStart, defaultEnd]);

  const windowsKey = useMemo(
    () => windows.map((w) => `${w.date}|${w.time_start}|${w.time_end}`).join("/"),
    [windows],
  );

  // Auto-check whenever inputs change.
  useEffect(() => {
    if (windows.length === 0) return;
    setChecking(true);
    setError(null);
    const t = setTimeout(async () => {
      const { data, error: e } = await checkWindowsConflict(tenantId, windows, jobId);
      setChecking(false);
      if (e) {
        setError(e.message);
        return;
      }
      setCheck(data as WindowsConflict);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowsKey, tenantId, jobId]);

  function setWindow(date: string, patch: Partial<JobWindowSpec>) {
    setWindows((ws) => ws.map((w) => (w.date === date ? { ...w, ...patch } : w)));
  }

  async function submit() {
    if (!check?.ok) return;
    setBusy(true);
    setError(null);
    const { error: e } = await confirmInquiry(jobId, windows);
    if (e) {
      setBusy(false);
      setError(e.message);
      return;
    }
    sendInquiryConfirmation(jobId).catch(() => {});
    setBusy(false);
    onConfirmed();
  }

  const badDays = check?.per_day.filter((d) => !d.result.ok) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle>Confirm inquiry</CardTitle>
          <Badge tone="brand">{jobNumber}</Badge>
        </CardHeader>

        <div className="text-xs text-ink-500 -mt-2">
          Set a time window for each day. The system checks conflicts with other
          bookings and blocked windows per-day.
        </div>

        <div className="mt-3">
          <Input
            label="End date (for multi-day jobs)"
            type="date"
            value={dateEnd}
            min={scheduledDate}
            onChange={(e) => setDateEnd(e.target.value)}
            hint="Defaults to start date. Extend to add more days."
          />
        </div>

        <div className="mt-3 space-y-2">
          {windows.map((w) => (
            <div key={w.date} className="rounded-xl border border-ink-900/5 bg-canvas p-2">
              {windows.length > 1 && (
                <div className="text-[11px] font-medium text-ink-700 mb-1.5">
                  {new Date(w.date + "T00:00:00").toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Start"
                  type="time"
                  value={w.time_start}
                  onChange={(e) => setWindow(w.date, { time_start: e.target.value })}
                />
                <Input
                  label="End"
                  type="time"
                  value={w.time_end}
                  onChange={(e) => setWindow(w.date, { time_end: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>

        {workingHours && (
          <div className="mt-2 text-[11px] text-ink-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Working hours: {workingHours.start.slice(0, 5)} – {workingHours.end.slice(0, 5)}
          </div>
        )}

        {checking && (
          <div className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs text-ink-500">Checking availability…</div>
        )}

        {check && !checking && (
          <div className="mt-3 space-y-2 text-xs">
            {check.ok ? (
              <div className="rounded-xl bg-mint-50 border border-mint-200 px-3 py-2 text-mint-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Available — no conflicts.
              </div>
            ) : (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-red-800 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <XCircle className="h-4 w-4" /> Conflict
                </div>
                {badDays.map((d) => (
                  <div key={d.date} className="space-y-0.5">
                    {windows.length > 1 && (
                      <div className="text-[11px] font-semibold">
                        {new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "2-digit",
                          month: "short",
                        })}
                      </div>
                    )}
                    {d.result.out_of_hours && d.result.working_hours && (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" />
                        Outside working hours ({d.result.working_hours.start.slice(0, 5)} – {d.result.working_hours.end.slice(0, 5)})
                      </div>
                    )}
                    {d.result.blocks.map((b) => (
                      <div key={b.id} className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" />
                        Blocked {b.time_start.slice(0, 5)} – {b.time_end.slice(0, 5)}
                        {b.reason ? ` (${b.reason})` : ""}
                      </div>
                    ))}
                    {d.result.jobs.map((j) => (
                      <div key={j.id} className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3" />
                        Overlaps with{" "}
                        <span className="font-mono">{j.number}</span> {j.time_start.slice(0, 5)} – {j.time_end.slice(0, 5)}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" block disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button block disabled={!check?.ok || busy} onClick={submit}>
            {busy ? "Confirming…" : "Confirm & notify farmer"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
