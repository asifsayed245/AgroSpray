import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Wheat, Calendar, Beaker, User, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import {
  checkWindowsConflict,
  listFarmers,
  submitJobForCompliance,
  upsertJobWindows,
  type JobWindowSpec,
  type WindowsConflict,
} from "@/data/queries";

const STEPS = ["Customer", "Field", "Schedule", "Spray", "Confirm"] as const;

type FormState = {
  farmerId: string | null;
  farmerName: string;
  farmerPhone: string;
  village: string;
  crop: string;
  areaAcres: number;
  scheduledDate: string;
  scheduledDateEnd: string;
  windows: JobWindowSpec[]; // one entry per day in [scheduledDate, scheduledDateEnd]
  allDay: boolean;
  sprayType: string;
  pesticideName: string;
};

const CROPS = ["cotton", "wheat", "soybean", "sugarcane", "paddy", "maize", "tomato", "chilli"] as const;
const SPRAY_TYPES = ["insecticide", "fungicide", "herbicide", "fertiliser"] as const;

const DEFAULT_WINDOW = { time_start: "08:00", time_end: "12:00" } as const;

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

// Rebuild the per-day windows array when the date range changes. Preserves
// any time picks the user already set for dates that remain in the range.
function reconcileWindows(
  start: string,
  end: string,
  existing: JobWindowSpec[],
): JobWindowSpec[] {
  const dates = datesInRange(start, end);
  const byDate = new Map(existing.map((w) => [w.date, w]));
  return dates.map((d) =>
    byDate.get(d) ?? { date: d, time_start: DEFAULT_WINDOW.time_start, time_end: DEFAULT_WINDOW.time_end },
  );
}

export default function NewJob() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tomorrow = new Date(Date.now() + 86400e3).toISOString().slice(0, 10);
  const [form, setForm] = useState<FormState>({
    farmerId: null,
    farmerName: "",
    farmerPhone: "",
    village: "",
    crop: "cotton",
    areaAcres: 5,
    scheduledDate: tomorrow,
    scheduledDateEnd: tomorrow,
    windows: [{ date: tomorrow, time_start: DEFAULT_WINDOW.time_start, time_end: DEFAULT_WINDOW.time_end }],
    allDay: false,
    sprayType: "insecticide",
    pesticideName: "",
  });

  const update = (p: Partial<FormState>) => {
    setForm((f) => {
      const next = { ...f, ...p };
      // Reconcile windows whenever the range changes.
      if (
        p.scheduledDate !== undefined ||
        p.scheduledDateEnd !== undefined
      ) {
        next.windows = reconcileWindows(next.scheduledDate, next.scheduledDateEnd, f.windows);
      }
      return next;
    });
  };

  const setWindow = (date: string, patch: Partial<JobWindowSpec>) => {
    setForm((f) => ({
      ...f,
      windows: f.windows.map((w) => (w.date === date ? { ...w, ...patch } : w)),
    }));
  };

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const { data: profile } = await supabase.from("profiles").select("tenant_id").single();
      if (!profile?.tenant_id) throw new Error("No tenant on profile — finish onboarding first.");

      let farmerId = form.farmerId;
      if (!farmerId) {
        const { data: farmer, error: fErr } = await supabase
          .from("farmers")
          .insert({
            tenant_id: profile.tenant_id,
            name: form.farmerName,
            phone: form.farmerPhone,
            village: form.village,
          })
          .select("id")
          .single();
        if (fErr) throw fErr;
        farmerId = farmer.id;
      }

      const { data: numberRow } = await supabase.rpc("generate_job_number", {
        p_tenant_id: profile.tenant_id,
        p_crop: form.crop,
        p_date: form.scheduledDate,
      });

      const firstWin = !form.allDay ? form.windows[0] : null;
      const multiDay = form.scheduledDateEnd && form.scheduledDateEnd !== form.scheduledDate;

      const { data: job, error: jErr } = await supabase
        .from("jobs")
        .insert({
          tenant_id: profile.tenant_id,
          number: numberRow ?? `AGR-${Date.now()}`,
          farmer_id: farmerId,
          crop: form.crop,
          area: form.areaAcres,
          area_acres: form.areaAcres,
          scheduled_date: form.scheduledDate,
          scheduled_date_end: multiDay ? form.scheduledDateEnd : null,
          scheduled_time_start: firstWin?.time_start ?? null,
          scheduled_time_end: firstWin?.time_end ?? null,
          village: form.village,
          spray_type: form.sprayType,
          pesticide_name: form.pesticideName || null,
        })
        .select("id")
        .single();
      if (jErr) throw jErr;

      // Insert per-day windows (unless all-day).
      if (!form.allDay) {
        const { error: wErr } = await upsertJobWindows(job.id, form.windows);
        if (wErr) throw wErr;
      }

      await submitJobForCompliance(job.id);
      nav(`/jobs/${job.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not create the job.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar title="New job" rightAccessory={<span className="text-xs text-ink-500">{step + 1} / {STEPS.length}</span>} />
      <div className="page space-y-4">
        <Stepper currentIdx={step} />

        {error && (
          <Card className="border border-red-100 bg-red-50/50">
            <div className="text-sm text-danger">{error}</div>
          </Card>
        )}

        {step === 0 && <StepCustomer form={form} update={update} onNext={() => setStep(1)} />}
        {step === 1 && <StepField form={form} update={update} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
        {step === 2 && (
          <StepSchedule
            form={form}
            update={update}
            setWindow={setWindow}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && <StepSpray form={form} update={update} onBack={() => setStep(2)} onNext={() => setStep(4)} />}
        {step === 4 && <StepConfirm form={form} busy={busy} onBack={() => setStep(3)} onSubmit={submit} />}
      </div>
    </>
  );
}

function Stepper({ currentIdx }: { currentIdx: number }) {
  return (
    <ol className="flex items-center gap-1.5">
      {STEPS.map((label, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={label} className="flex-1">
            <div
              className={cn(
                "h-1.5 w-full rounded-full",
                done && "bg-brand-700",
                active && "bg-brand-gradient",
                !done && !active && "bg-ink-900/8",
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}

function StepCustomer({
  form,
  update,
  onNext,
}: {
  form: FormState;
  update: (p: Partial<FormState>) => void;
  onNext: () => void;
}) {
  const [search, setSearch] = useState("");
  const farmers = useSupabaseQuery(() => listFarmers(search), [search]);
  const valid = !!form.farmerId || (form.farmerName.length > 1 && form.farmerPhone.length >= 10);

  return (
    <Card>
      <div className="row">
        <IconTile tone="brand"><User className="h-5 w-5" /></IconTile>
        <div>
          <div className="text-sm font-semibold text-ink-900">Who is this for?</div>
          <div className="text-xs text-ink-500">Pick an existing farmer or add a new one.</div>
        </div>
      </div>

      <Input
        className="mt-4"
        placeholder="Search by name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ul className="mt-3 max-h-64 overflow-y-auto divide-y divide-ink-900/5">
        {farmers.data?.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => update({ farmerId: f.id, farmerName: f.name, village: f.village ?? "" })}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left rounded-2xl",
                form.farmerId === f.id ? "bg-brand-50" : "hover:bg-ink-900/3",
              )}
            >
              <div className="h-8 w-8 rounded-full bg-brand-100 inline-flex items-center justify-center text-brand-800 text-xs font-bold">
                {f.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink-900 truncate">{f.name}</div>
                <div className="text-xs text-ink-500 truncate">{f.phone ?? "no phone"} · {f.village ?? "—"}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-2">
        <div className="text-xs font-medium text-ink-700">Or add a new farmer</div>
        <Input
          placeholder="Full name"
          value={form.farmerName}
          onChange={(e) => update({ farmerId: null, farmerName: e.target.value })}
        />
        <Input
          placeholder="Mobile number"
          type="tel"
          value={form.farmerPhone}
          onChange={(e) => update({ farmerPhone: e.target.value })}
        />
      </div>

      <Button block className="mt-5" disabled={!valid} onClick={onNext}>
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
    </Card>
  );
}

function StepField({
  form,
  update,
  onBack,
  onNext,
}: {
  form: FormState;
  update: (p: Partial<FormState>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <div className="row">
        <IconTile tone="brand"><Wheat className="h-5 w-5" /></IconTile>
        <div>
          <div className="text-sm font-semibold text-ink-900">Field</div>
          <div className="text-xs text-ink-500">Crop and area to spray.</div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-ink-700">Crop</label>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {CROPS.map((c) => (
              <button
                key={c}
                onClick={() => update({ crop: c })}
                className={cn(
                  "rounded-2xl px-3 py-2 text-sm capitalize",
                  form.crop === c ? "bg-brand-700 text-white" : "bg-canvas text-ink-700",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Area (acres)"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={form.areaAcres}
          onChange={(e) => update({ areaAcres: Number(e.target.value || 0) })}
        />
        <Input
          label="Village"
          placeholder="e.g. Wai"
          value={form.village}
          onChange={(e) => update({ village: e.target.value })}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" block onClick={onBack}>Back</Button>
        <Button block disabled={form.areaAcres <= 0} onClick={onNext}>
          Continue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function StepSchedule({
  form,
  update,
  setWindow,
  onBack,
  onNext,
}: {
  form: FormState;
  update: (p: Partial<FormState>) => void;
  setWindow: (date: string, patch: Partial<JobWindowSpec>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const dates = useMemo(() => {
    const list: { date: string; label: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" }),
      });
    }
    return list;
  }, []);
  return (
    <Card>
      <div className="row">
        <IconTile tone="brand"><Calendar className="h-5 w-5" /></IconTile>
        <div>
          <div className="text-sm font-semibold text-ink-900">Schedule</div>
          <div className="text-xs text-ink-500">When should the drone fly?</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {dates.map((d) => (
          <button
            key={d.date}
            onClick={() => update({ scheduledDate: d.date })}
            className={cn(
              "rounded-2xl px-3 py-2 text-sm",
              form.scheduledDate === d.date ? "bg-brand-700 text-white" : "bg-canvas text-ink-700",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Input
          label="Start date"
          type="date"
          value={form.scheduledDate}
          onChange={(e) => {
            const v = e.target.value;
            update({
              scheduledDate: v,
              scheduledDateEnd: form.scheduledDateEnd < v ? v : form.scheduledDateEnd,
            });
          }}
        />
        <Input
          label="End date (multi-day)"
          type="date"
          value={form.scheduledDateEnd}
          min={form.scheduledDate}
          onChange={(e) => update({ scheduledDateEnd: e.target.value })}
          hint="Same as start for single-day"
        />
      </div>

      <div className="mt-3 rounded-2xl border border-ink-900/5 bg-canvas p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-ink-900">
            Time {form.windows.length > 1 ? "windows (per day)" : "window"}
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-ink-700">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => update({ allDay: e.target.checked })}
            />
            All day
          </label>
        </div>

        {!form.allDay && (
          <div className="mt-2 space-y-2">
            {form.windows.map((w) => (
              <div
                key={w.date}
                className="rounded-xl border border-ink-900/5 bg-white p-2"
              >
                {form.windows.length > 1 && (
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
        )}
      </div>

      <AvailabilityCheck form={form} />

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" block onClick={onBack}>Back</Button>
        <Button block onClick={onNext}>Continue <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}

function StepSpray({
  form,
  update,
  onBack,
  onNext,
}: {
  form: FormState;
  update: (p: Partial<FormState>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <div className="row">
        <IconTile tone="brand"><Beaker className="h-5 w-5" /></IconTile>
        <div>
          <div className="text-sm font-semibold text-ink-900">Spray</div>
          <div className="text-xs text-ink-500">CIB approval is checked at compliance.</div>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-medium text-ink-700">Type</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {SPRAY_TYPES.map((s) => (
            <button
              key={s}
              onClick={() => update({ sprayType: s })}
              className={cn(
                "rounded-2xl px-3 py-2 text-sm capitalize",
                form.sprayType === s ? "bg-brand-700 text-white" : "bg-canvas text-ink-700",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Input
        className="mt-3"
        label="Pesticide / chemical name (optional)"
        placeholder="e.g. Chlorantraniliprole 18.5 SC"
        value={form.pesticideName}
        onChange={(e) => update({ pesticideName: e.target.value })}
        hint="Leave blank if the farmer is supplying their own — admin can add later."
      />

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" block onClick={onBack}>Back</Button>
        <Button block onClick={onNext}>Review <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}

function StepConfirm({
  form,
  busy,
  onBack,
  onSubmit,
}: {
  form: FormState;
  busy: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const fmtDay = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const datePart =
    form.scheduledDate === form.scheduledDateEnd
      ? fmtDay(form.scheduledDate)
      : `${fmtDay(form.scheduledDate)} – ${fmtDay(form.scheduledDateEnd)}`;

  return (
    <Card>
      <div className="text-sm font-semibold text-ink-900">Review</div>
      <ul className="mt-3 divide-y divide-ink-900/5">
        <Row k="Customer" v={form.farmerName || "Selected farmer"} />
        <Row k="Village" v={form.village || "—"} />
        <Row k="Crop" v={`${form.crop} · ${form.areaAcres} ac`} />
        <Row k="Date" v={datePart} />
        <li className="py-2">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs text-ink-500 pt-0.5">Time window</span>
            <div className="text-sm font-medium text-ink-900 text-right">
              {form.allDay ? (
                <span>All day</span>
              ) : (
                <ul className="space-y-0.5">
                  {form.windows.map((w) => (
                    <li key={w.date} className="tnum">
                      {form.windows.length > 1 && (
                        <span className="text-xs text-ink-500 mr-2">{fmtDay(w.date)}</span>
                      )}
                      {w.time_start} – {w.time_end}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </li>
        <Row k="Spray" v={`${form.sprayType}${form.pesticideName ? ` · ${form.pesticideName}` : ""}`} />
      </ul>

      <p className="mt-4 text-xs text-ink-500">
        On confirm: pricing is calculated, compliance checks run, and if all pass a slot is reserved.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" block onClick={onBack}>Back</Button>
        <Button block disabled={busy} onClick={onSubmit}>
          {busy ? "Creating…" : "Create job"}
        </Button>
      </div>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex items-center justify-between py-2">
      <span className="text-xs text-ink-500">{k}</span>
      <span className="text-sm font-medium text-ink-900 text-right">{v}</span>
    </li>
  );
}

function AvailabilityCheck({ form }: { form: FormState }) {
  const [check, setCheck] = useState<WindowsConflict | null>(null);
  const [checking, setChecking] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("profiles").select("tenant_id").maybeSingle().then(({ data }) => {
      setTenantId((data as { tenant_id?: string } | null)?.tenant_id ?? null);
    });
  }, []);

  // Stringify deps so React re-runs when the underlying windows actually change.
  const windowsKey = form.windows.map((w) => `${w.date}|${w.time_start}|${w.time_end}`).join("/");

  useEffect(() => {
    if (!tenantId || form.allDay) {
      setCheck(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      const { data } = await checkWindowsConflict(tenantId, form.windows);
      setCheck(data as WindowsConflict);
      setChecking(false);
    }, 300);
    return () => clearTimeout(t);
  }, [tenantId, windowsKey, form.allDay]);

  if (form.allDay) return null;
  if (checking && !check) {
    return <div className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs text-ink-500">Checking availability…</div>;
  }
  if (!check) return null;
  if (check.ok) {
    return (
      <div className="mt-3 rounded-xl bg-mint-50 border border-mint-200 px-3 py-2 text-xs text-mint-800 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" /> Available — no conflicts.
      </div>
    );
  }
  const badDays = check.per_day.filter((d) => !d.result.ok);
  return (
    <div className="mt-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 space-y-2">
      <div className="flex items-center gap-2 font-medium">
        <XCircle className="h-4 w-4" /> Conflict — adjust the window
      </div>
      {badDays.map((d) => (
        <div key={d.date} className="space-y-0.5">
          {check.per_day.length > 1 && (
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
              Overlaps with <span className="font-mono">{j.number}</span> {j.time_start.slice(0, 5)} – {j.time_end.slice(0, 5)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
