import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Wheat, Calendar, Beaker, User } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { listFarmers, submitJobForCompliance } from "@/data/queries";

const STEPS = ["Customer", "Field", "Schedule", "Spray", "Confirm"] as const;

type FormState = {
  farmerId: string | null;
  farmerName: string;
  farmerPhone: string;
  village: string;
  crop: string;
  areaAcres: number;
  scheduledDate: string;
  sprayType: string;
  pesticideName: string;
};

const CROPS = ["cotton", "wheat", "soybean", "sugarcane", "paddy", "maize", "tomato", "chilli"] as const;
const SPRAY_TYPES = ["insecticide", "fungicide", "herbicide", "fertiliser"] as const;

export default function NewJob() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    farmerId: null,
    farmerName: "",
    farmerPhone: "",
    village: "",
    crop: "cotton",
    areaAcres: 5,
    scheduledDate: new Date(Date.now() + 86400e3).toISOString().slice(0, 10),
    sprayType: "insecticide",
    pesticideName: "",
  });
  const update = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      // Get tenant from the current profile (RLS will scope writes).
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .single();
      if (!profile?.tenant_id) throw new Error("No tenant on profile — finish onboarding first.");

      // Find or create farmer
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

      // Generate the job number server-side, then create the job.
      const { data: numberRow } = await supabase.rpc("generate_job_number", {
        p_tenant_id: profile.tenant_id,
        p_crop: form.crop,
        p_date: form.scheduledDate,
      });

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
          village: form.village,
          spray_type: form.sprayType,
          pesticide_name: form.pesticideName || null,
        })
        .select("id")
        .single();
      if (jErr) throw jErr;

      // Run compliance / reserve slot.
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

        {step === 0 && (
          <StepCustomer
            form={form}
            update={update}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepField
            form={form}
            update={update}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepSchedule
            form={form}
            update={update}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepSpray
            form={form}
            update={update}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <StepConfirm
            form={form}
            busy={busy}
            onBack={() => setStep(3)}
            onSubmit={submit}
          />
        )}
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
  onBack,
  onNext,
}: {
  form: FormState;
  update: (p: Partial<FormState>) => void;
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

      <Input
        className="mt-3"
        label="Or pick a specific date"
        type="date"
        value={form.scheduledDate}
        onChange={(e) => update({ scheduledDate: e.target.value })}
      />

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
  return (
    <Card>
      <div className="text-sm font-semibold text-ink-900">Review</div>
      <ul className="mt-3 divide-y divide-ink-900/5">
        <Row k="Customer" v={form.farmerName || "Selected farmer"} />
        <Row k="Village" v={form.village || "—"} />
        <Row k="Crop" v={`${form.crop} · ${form.areaAcres} ac`} />
        <Row k="Date" v={form.scheduledDate} />
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
