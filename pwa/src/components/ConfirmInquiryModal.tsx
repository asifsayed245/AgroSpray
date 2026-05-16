import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  checkWindowConflict,
  confirmInquiry,
  sendInquiryConfirmation,
  type WindowConflict,
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
  const [timeStart, setTimeStart] = useState(defaultStart);
  const [timeEnd, setTimeEnd] = useState(defaultEnd);
  const [dateEnd, setDateEnd] = useState(scheduledDateEnd ?? scheduledDate);
  const [check, setCheck] = useState<WindowConflict | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runCheck() {
    setChecking(true);
    setError(null);
    const { data, error: e } = await checkWindowConflict(
      tenantId,
      scheduledDate,
      timeStart,
      timeEnd,
      jobId,
    );
    setChecking(false);
    if (e) {
      setError(e.message);
      return;
    }
    setCheck(data as WindowConflict);
  }

  // Auto-check whenever inputs change
  useEffect(() => {
    if (!timeStart || !timeEnd) return;
    const t = setTimeout(runCheck, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeStart, timeEnd, scheduledDate]);

  async function submit() {
    if (!check?.ok) return;
    setBusy(true);
    setError(null);
    const { error: e } = await confirmInquiry(jobId, timeStart, timeEnd, dateEnd);
    if (e) {
      setBusy(false);
      setError(e.message);
      return;
    }
    // fire-and-forget telegram delivery
    sendInquiryConfirmation(jobId).catch(() => {});
    setBusy(false);
    onConfirmed();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md md:max-w-lg"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle>Confirm inquiry</CardTitle>
          <Badge tone="brand">{jobNumber}</Badge>
        </CardHeader>

        <div className="text-xs text-ink-500 -mt-2">
          Pick a time window for {scheduledDate}. The system will check for
          conflicts with other bookings and blocked windows.
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Input
            label="Start"
            type="time"
            value={timeStart}
            onChange={(e) => setTimeStart(e.target.value)}
          />
          <Input
            label="End"
            type="time"
            value={timeEnd}
            onChange={(e) => setTimeEnd(e.target.value)}
          />
        </div>

        <div className="mt-3">
          <Input
            label="End date (for multi-day jobs)"
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            hint="Defaults to start date. Set later for multi-day jobs."
          />
        </div>

        {workingHours && (
          <div className="mt-2 text-[11px] text-ink-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Working hours: {workingHours.start.slice(0, 5)} – {workingHours.end.slice(0, 5)}
          </div>
        )}

        {checking && (
          <div className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs text-ink-500">Checking availability…</div>
        )}

        {check && (
          <div className="mt-3 space-y-2 text-xs">
            {check.ok ? (
              <div className="rounded-xl bg-mint-50 border border-mint-200 px-3 py-2 text-mint-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Available — no conflicts.
              </div>
            ) : (
              <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-red-800 space-y-1">
                <div className="flex items-center gap-2 font-medium">
                  <XCircle className="h-4 w-4" /> Conflict
                </div>
                {check.out_of_hours && check.working_hours && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Outside working hours ({check.working_hours.start.slice(0, 5)} – {check.working_hours.end.slice(0, 5)})
                  </div>
                )}
                {check.blocks.map((b) => (
                  <div key={b.id} className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Blocked {b.time_start.slice(0, 5)} – {b.time_end.slice(0, 5)}
                    {b.reason ? ` (${b.reason})` : ""}
                  </div>
                ))}
                {check.jobs.map((j) => (
                  <div key={j.id} className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    Overlaps with{" "}
                    <span className="font-mono">{j.number}</span> {j.time_start.slice(0, 5)} – {j.time_end.slice(0, 5)}
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
