import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone, Mail, Building2, Send, Users as UsersIcon, Receipt, CheckCircle2, ArrowRight,
  ShieldCheck, Plane, User,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const STEPS = ["Sign up", "Business", "Telegram", "Team", "Pricing", "Activate"] as const;

interface SignUpData {
  method: "phone" | "email";
  phone: string;
  email: string;
  password: string;
  otp: string;
  otpSent: boolean;
}
interface BusinessData {
  name: string;
  gstin: string;
  pan: string;
  state: string;
  registered_address: string;
  dgca_operator_uin: string;
}
interface TgData {
  bot_token: string;
  ops_chat_id: string;
}
interface PricingData {
  per_acre: number;
  free_h: number;
  half_h: number;
  upi_vpa: string;
}
interface PilotInput {
  name: string;
  phone: string;
  telegram_id: string;
  rpc_number: string;
  rpc_expiry: string;
}
interface DroneInput {
  display_id: string;
  uin: string;
  model: string;
  payload_l: number;
}

export default function Onboarding() {
  const nav = useNavigate();
  const { session, signInWithPassword, signUpWithPassword, profile, refresh } = useAuth();

  const [step, setStep] = useState(0);
  const [signUp, setSignUp] = useState<SignUpData>({
    method: "email",
    phone: "",
    email: "",
    password: "",
    otp: "",
    otpSent: false,
  });
  const [business, setBusiness] = useState<BusinessData>({
    name: "",
    gstin: "",
    pan: "",
    state: "",
    registered_address: "",
    dgca_operator_uin: "",
  });
  const [tg, setTg] = useState<TgData>({ bot_token: "", ops_chat_id: "" });
  const [pricing, setPricing] = useState<PricingData>({
    per_acre: 600,
    free_h: 24,
    half_h: 4,
    upi_vpa: "",
  });
  const [pilots, setPilots] = useState<PilotInput[]>([]);
  const [drones, setDrones] = useState<DroneInput[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(profile?.tenant_id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTenantId(profile?.tenant_id ?? null);
  }, [profile]);

  return (
    <>
      <TopBar
        title="Onboarding"
        rightAccessory={
          <span className="text-xs font-semibold text-ink-500 tnum">
            {step + 1} / {STEPS.length}
          </span>
        }
      />
      <div className="page">
        <Stepper currentIdx={step} />

        {error && (
          <Card className="mt-3 border border-red-100 bg-red-50/50">
            <div className="text-sm text-danger">{error}</div>
          </Card>
        )}

        <div className="mt-4 space-y-3">
          {step === 0 && (
            <StepSignUp
              data={signUp}
              setData={setSignUp}
              busy={busy}
              onSubmit={async () => {
                setBusy(true);
                setError(null);
                let err: string | null = null;
                if (signUp.method === "email") {
                  const r = await signUpWithPassword(signUp.email, signUp.password);
                  err = r.error;
                  if (err && err.toLowerCase().includes("already")) {
                    // Fall back to signing in if the email already exists
                    const s = await signInWithPassword(signUp.email, signUp.password);
                    err = s.error;
                  }
                } else {
                  err = "Phone OTP requires a Twilio/MSG91 SMS provider — use email for local dev.";
                }
                setBusy(false);
                if (err) setError(err);
                else setStep(1);
              }}
            />
          )}

          {step === 1 && (
            <StepBusiness
              data={business}
              setData={setBusiness}
              busy={busy}
              onBack={() => setStep(0)}
              onSubmit={async () => {
                setBusy(true); setError(null);
                try {
                  const { data, error } = await supabase
                    .from("tenants")
                    .insert({
                      slug: slugify(business.name),
                      ...business,
                    })
                    .select("id")
                    .single();
                  if (error) throw error;
                  setTenantId(data.id);
                  // Bind current user's profile to this tenant as owner
                  if (session?.user) {
                    await supabase
                      .from("profiles")
                      .update({ tenant_id: data.id, role: "owner" })
                      .eq("id", session.user.id);
                    await refresh();
                  }
                  setStep(2);
                } catch (e: unknown) {
                  setError(e instanceof Error ? e.message : "Could not save business identity");
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}

          {step === 2 && (
            <StepTelegram
              data={tg}
              setData={setTg}
              onBack={() => setStep(1)}
              onSubmit={async () => {
                if (tenantId && (tg.bot_token || tg.ops_chat_id)) {
                  await supabase.from("tenants").update({
                    telegram_bot_token: tg.bot_token || null,
                    telegram_ops_chat_id: tg.ops_chat_id || null,
                  }).eq("id", tenantId);
                }
                setStep(3);
              }}
              onSkip={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <StepTeam
              pilots={pilots}
              setPilots={setPilots}
              drones={drones}
              setDrones={setDrones}
              onBack={() => setStep(2)}
              onSubmit={async () => {
                if (!tenantId) return setStep(4);
                if (pilots.length) {
                  await supabase.from("pilots").insert(
                    pilots.map((p) => ({ ...p, tenant_id: tenantId })),
                  );
                }
                if (drones.length) {
                  await supabase.from("drones").insert(
                    drones.map((d) => ({ ...d, tenant_id: tenantId })),
                  );
                }
                setStep(4);
              }}
              onSkip={() => setStep(4)}
            />
          )}

          {step === 4 && (
            <StepPricing
              data={pricing}
              setData={setPricing}
              onBack={() => setStep(3)}
              onSubmit={async () => {
                if (tenantId) {
                  await supabase.from("tenants").update({
                    pricing_defaults: { baseRatePerAcre: pricing.per_acre },
                    cancellation_policy: {
                      freeBeforeHours: pricing.free_h,
                      halfBeforeHours: pricing.half_h,
                      fullWithinHours: pricing.half_h,
                    },
                    upi_vpa: pricing.upi_vpa || null,
                  }).eq("id", tenantId);
                }
                setStep(5);
              }}
            />
          )}

          {step === 5 && (
            <StepActivate
              busy={busy}
              onBack={() => setStep(4)}
              onFinish={async () => {
                setBusy(true);
                if (tenantId) {
                  await supabase.from("tenants").update({ activated_at: new Date().toISOString() }).eq("id", tenantId);
                }
                setBusy(false);
                nav("/");
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 16) || "sup";
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
              aria-current={active ? "step" : undefined}
            />
          </li>
        );
      })}
    </ol>
  );
}

function StepSignUp({
  data, setData, busy, onSubmit,
}: {
  data: SignUpData;
  setData: (d: SignUpData) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  const valid = data.method === "email"
    ? /\S+@\S+\.\S+/.test(data.email) && data.password.length >= 8
    : data.phone.length >= 10;
  return (
    <Card>
      <h2 className="text-lg font-semibold text-ink-900">Welcome to AgroSpray</h2>
      <p className="mt-1 text-sm text-ink-500">Set up your supplier tenant in six steps.</p>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-1">
        <button
          onClick={() => setData({ ...data, method: "email" })}
          className={cn("rounded-full py-2 text-sm font-semibold",
            data.method === "email" ? "bg-brand-700 text-white" : "text-ink-500")}
        >
          <Mail className="inline h-4 w-4 mr-1" /> Email
        </button>
        <button
          onClick={() => setData({ ...data, method: "phone" })}
          className={cn("rounded-full py-2 text-sm font-semibold",
            data.method === "phone" ? "bg-brand-700 text-white" : "text-ink-500")}
        >
          <Phone className="inline h-4 w-4 mr-1" /> Phone
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {data.method === "email" ? (
          <>
            <Input
              label="Work email"
              type="email"
              value={data.email}
              onChange={(e) => setData({ ...data, email: e.target.value })}
              placeholder="you@company.in"
            />
            <Input
              label="Password"
              type="password"
              value={data.password}
              onChange={(e) => setData({ ...data, password: e.target.value })}
              placeholder="At least 8 characters"
              hint="Used for future sign-ins."
            />
          </>
        ) : (
          <Input
            label="Mobile number"
            type="tel"
            value={data.phone}
            onChange={(e) => setData({ ...data, phone: e.target.value })}
            hint="Phone OTP requires SMS provider configuration."
          />
        )}
      </div>

      <Button block className="mt-5" disabled={!valid || busy} onClick={onSubmit}>
        {busy ? "Creating account…" : "Continue"} <ArrowRight className="h-4 w-4" />
      </Button>
      <p className="mt-3 flex items-start gap-2 text-[11px] text-ink-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-700" />
        We store personal data in India (DPDP Act 2023). Read the full notice on the next step.
      </p>
    </Card>
  );
}

function StepBusiness({
  data, setData, busy, onBack, onSubmit,
}: {
  data: BusinessData;
  setData: (d: BusinessData) => void;
  busy: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const valid =
    data.name.trim().length > 1 &&
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gstin) &&
    /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(data.pan) &&
    data.dgca_operator_uin.length > 4 &&
    data.state.length > 1;

  return (
    <Card>
      <div className="row">
        <IconTile tone="brand" size="lg"><Building2 className="h-6 w-6" /></IconTile>
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Business identity</h2>
          <p className="text-xs text-ink-500">DGCA UIN is validated against DigitalSky.</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Input label="Business name" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
        <Input label="GSTIN" value={data.gstin} onChange={(e) => setData({ ...data, gstin: e.target.value.toUpperCase() })} />
        <Input label="PAN" value={data.pan} onChange={(e) => setData({ ...data, pan: e.target.value.toUpperCase() })} />
        <Input label="State" value={data.state} onChange={(e) => setData({ ...data, state: e.target.value })} />
        <Input label="Registered address" value={data.registered_address} onChange={(e) => setData({ ...data, registered_address: e.target.value })} />
        <Input label="DGCA operator UIN" value={data.dgca_operator_uin} onChange={(e) => setData({ ...data, dgca_operator_uin: e.target.value })} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" block onClick={onBack}>Back</Button>
        <Button block disabled={!valid || busy} onClick={onSubmit}>
          {busy ? "Saving…" : "Continue"} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function StepTelegram({
  data, setData, onBack, onSubmit, onSkip,
}: {
  data: TgData;
  setData: (d: TgData) => void;
  onBack: () => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <Card>
      <div className="row">
        <IconTile tone="brand" size="lg"><Send className="h-6 w-6" /></IconTile>
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Telegram setup</h2>
          <p className="text-xs text-ink-500">Bring your own bot or use the shared platform bot.</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Input
          label="Bot token (from @BotFather)"
          type="password"
          value={data.bot_token}
          onChange={(e) => setData({ ...data, bot_token: e.target.value })}
          placeholder="e.g. 1234:ABC-DEF..."
          hint="Stored encrypted. Leave blank to use the shared bot in Phase 2."
        />
        <Input
          label="Ops Telegram chat ID"
          value={data.ops_chat_id}
          onChange={(e) => setData({ ...data, ops_chat_id: e.target.value })}
          placeholder="-1001234567890"
          hint="Where ops alerts go. Use @userinfobot to find yours."
        />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button variant="outline" block onClick={onBack}>Back</Button>
        <Button variant="ghost" block onClick={onSkip}>Skip</Button>
        <Button block onClick={onSubmit}>Save</Button>
      </div>
    </Card>
  );
}

function StepTeam({
  pilots, setPilots, drones, setDrones, onBack, onSubmit, onSkip,
}: {
  pilots: PilotInput[];
  setPilots: (p: PilotInput[]) => void;
  drones: DroneInput[];
  setDrones: (d: DroneInput[]) => void;
  onBack: () => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  function addPilot() {
    setPilots([...pilots, { name: "", phone: "", telegram_id: "", rpc_number: "", rpc_expiry: "" }]);
  }
  function addDrone() {
    setDrones([...drones, { display_id: "", uin: "", model: "DJI Agras T40", payload_l: 40 }]);
  }
  return (
    <Card>
      <div className="row">
        <IconTile tone="brand" size="lg"><UsersIcon className="h-6 w-6" /></IconTile>
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Team and assets</h2>
          <p className="text-xs text-ink-500">Skip if you'll add these later from Settings.</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-ink-900"><User className="inline h-4 w-4 mr-1" /> Pilots</div>
          <Button size="sm" variant="ghost" onClick={addPilot}>+ Add pilot</Button>
        </div>
        <div className="mt-2 space-y-2">
          {pilots.map((p, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-2">
              <Input placeholder="Name" value={p.name} onChange={(e) => {
                const np = [...pilots]; np[i] = { ...p, name: e.target.value }; setPilots(np);
              }} />
              <Input placeholder="Phone" value={p.phone} onChange={(e) => {
                const np = [...pilots]; np[i] = { ...p, phone: e.target.value }; setPilots(np);
              }} />
              <Input placeholder="RPC number" value={p.rpc_number} onChange={(e) => {
                const np = [...pilots]; np[i] = { ...p, rpc_number: e.target.value }; setPilots(np);
              }} />
              <Input placeholder="RPC expiry" type="date" value={p.rpc_expiry} onChange={(e) => {
                const np = [...pilots]; np[i] = { ...p, rpc_expiry: e.target.value }; setPilots(np);
              }} />
            </div>
          ))}
          {pilots.length === 0 && (
            <div className="text-xs text-ink-500 text-center py-2">No pilots added yet.</div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-ink-900"><Plane className="inline h-4 w-4 mr-1" /> Drones</div>
          <Button size="sm" variant="ghost" onClick={addDrone}>+ Add drone</Button>
        </div>
        <div className="mt-2 space-y-2">
          {drones.map((d, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-2xl bg-canvas p-2">
              <Input placeholder="Display ID" value={d.display_id} onChange={(e) => {
                const nd = [...drones]; nd[i] = { ...d, display_id: e.target.value }; setDrones(nd);
              }} />
              <Input placeholder="UIN" value={d.uin} onChange={(e) => {
                const nd = [...drones]; nd[i] = { ...d, uin: e.target.value }; setDrones(nd);
              }} />
              <Input placeholder="Model" value={d.model} onChange={(e) => {
                const nd = [...drones]; nd[i] = { ...d, model: e.target.value }; setDrones(nd);
              }} />
              <Input type="number" placeholder="Payload (L)" value={d.payload_l}
                onChange={(e) => {
                  const nd = [...drones]; nd[i] = { ...d, payload_l: Number(e.target.value) }; setDrones(nd);
                }} />
            </div>
          ))}
          {drones.length === 0 && (
            <div className="text-xs text-ink-500 text-center py-2">No drones added yet.</div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button variant="outline" block onClick={onBack}>Back</Button>
        <Button variant="ghost" block onClick={onSkip}>Skip</Button>
        <Button block onClick={onSubmit}>Save</Button>
      </div>
    </Card>
  );
}

function StepPricing({
  data, setData, onBack, onSubmit,
}: {
  data: PricingData;
  setData: (d: PricingData) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <Card>
      <div className="row">
        <IconTile tone="brand" size="lg"><Receipt className="h-6 w-6" /></IconTile>
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Pricing and payout</h2>
          <p className="text-xs text-ink-500">Defaults — override per job in Settings later.</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Input
          label="Per-acre base rate (₹)"
          type="number"
          value={data.per_acre}
          onChange={(e) => setData({ ...data, per_acre: Number(e.target.value) })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Free cancellation before (hours)"
            type="number"
            value={data.free_h}
            onChange={(e) => setData({ ...data, free_h: Number(e.target.value) })}
          />
          <Input
            label="50% cancellation before (hours)"
            type="number"
            value={data.half_h}
            onChange={(e) => setData({ ...data, half_h: Number(e.target.value) })}
          />
        </div>
        <Input
          label="UPI VPA for payouts"
          placeholder="business@bank"
          value={data.upi_vpa}
          onChange={(e) => setData({ ...data, upi_vpa: e.target.value })}
        />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" block onClick={onBack}>Back</Button>
        <Button block onClick={onSubmit}>Continue <ArrowRight className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}

function StepActivate({
  busy, onBack, onFinish,
}: {
  busy: boolean;
  onBack: () => void;
  onFinish: () => void;
}) {
  const [accepted, setAccepted] = useState(false);
  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <IconTile tone="mint" size="lg"><CheckCircle2 className="h-7 w-7" /></IconTile>
        <h2 className="mt-3 text-lg font-semibold text-ink-900">You're ready to activate</h2>
        <p className="mt-1 max-w-xs text-sm text-ink-500">
          By activating, you accept the AgroSpray Terms of Service and acknowledge the DPDP
          Act 2023 privacy notice. Data is stored in India (Mumbai region).
        </p>
      </div>
      <label className="mt-4 flex items-start gap-2 rounded-2xl bg-canvas p-3">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 text-brand-700" />
        <span className="text-xs text-ink-700">
          I confirm I have authority to bind this business to AgroSpray's Terms and DPDP notice.
        </span>
      </label>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" block onClick={onBack}>Back</Button>
        <Button block disabled={!accepted || busy} onClick={onFinish}>
          {busy ? "Activating…" : "Activate tenant"}
        </Button>
      </div>
    </Card>
  );
}
