import { useState } from "react";
import {
  Building2,
  Send,
  Receipt,
  Users,
  Plane,
  Bell,
  ShieldCheck,
  ScrollText,
  Save,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardSubtitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconTile } from "@/components/ui/icon-tile";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { getTenant } from "@/data/queries";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const { profile, signOut } = useAuth();
  const tenant = useSupabaseQuery(getTenant);
  const t = tenant.data;

  return (
    <>
      <TopBar title="Settings" />
      <div className="page space-y-4">
        <Card>
          <div className="row">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white font-bold">
              {(profile?.full_name ?? profile?.email ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink-900">{profile?.full_name ?? "—"}</div>
              <div className="text-xs text-ink-500">{profile?.email ?? profile?.phone ?? "—"}</div>
              <Badge tone="brand" className="mt-1 capitalize">
                {profile?.role}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Sign out
            </Button>
          </div>
        </Card>

        <Tabs defaultValue="business">
          <div className="-mx-4 overflow-x-auto px-4">
            <TabsList className="w-max">
              <TabsTrigger value="business"><Building2 className="h-3.5 w-3.5" /> Business</TabsTrigger>
              <TabsTrigger value="telegram"><Send className="h-3.5 w-3.5" /> Telegram</TabsTrigger>
              <TabsTrigger value="pricing"><Receipt className="h-3.5 w-3.5" /> Pricing</TabsTrigger>
              <TabsTrigger value="users"><Users className="h-3.5 w-3.5" /> Users</TabsTrigger>
              <TabsTrigger value="fleet"><Plane className="h-3.5 w-3.5" /> Fleet</TabsTrigger>
              <TabsTrigger value="notif"><Bell className="h-3.5 w-3.5" /> Notif</TabsTrigger>
              <TabsTrigger value="dpdp"><ShieldCheck className="h-3.5 w-3.5" /> DPDP</TabsTrigger>
              <TabsTrigger value="audit"><ScrollText className="h-3.5 w-3.5" /> Audit</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="business">
            <BusinessTab tenantId={t?.id} initial={t} />
          </TabsContent>

          <TabsContent value="telegram">
            <TelegramTab tenantId={t?.id} initial={t} />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingTab tenantId={t?.id} initial={t} />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="fleet">
            <Card>
              <p className="text-sm text-ink-700">
                Add, edit, or retire pilots and drones from the Drone Fleet and Pilots pages.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="outline" block asChild>
                  <a href="/pilots">Pilots</a>
                </Button>
                <Button variant="outline" block asChild>
                  <a href="/fleet">Drone fleet</a>
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="notif">
            <NotifTab tenantId={t?.id} initial={t} />
          </TabsContent>

          <TabsContent value="dpdp">
            <DpdpTab />
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <p className="text-sm text-ink-700 mb-3">
                Full audit history is available at <code className="bg-canvas px-1 rounded">/audit</code>.
              </p>
              <Button asChild>
                <a href="/audit">Open audit log</a>
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

type Tenant = NonNullable<Awaited<ReturnType<typeof getTenant>>["data"]>;

function BusinessTab({ tenantId, initial }: { tenantId?: string; initial?: Tenant | null }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    gstin: initial?.gstin ?? "",
    pan: initial?.pan ?? "",
    dgca_operator_uin: initial?.dgca_operator_uin ?? "",
    state: initial?.state ?? "",
    registered_address: initial?.registered_address ?? "",
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!tenantId) return;
    setSaving(true);
    await supabase.from("tenants").update(form).eq("id", tenantId);
    setSaving(false);
  }
  return (
    <Card>
      <div className="row">
        <IconTile tone="brand"><Building2 className="h-5 w-5" /></IconTile>
        <CardSubtitle>Identity displayed on invoices and used for DGCA validation.</CardSubtitle>
      </div>
      <div className="mt-4 space-y-3">
        <Input label="Business name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
        <Input label="PAN" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} />
        <Input label="DGCA Operator UIN" value={form.dgca_operator_uin} onChange={(e) => setForm({ ...form, dgca_operator_uin: e.target.value })} />
        <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        <Input label="Registered address" value={form.registered_address} onChange={(e) => setForm({ ...form, registered_address: e.target.value })} />
      </div>
      <Button block className="mt-4" onClick={save} disabled={saving}>
        <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
      </Button>
    </Card>
  );
}

function TelegramTab({ tenantId, initial }: { tenantId?: string; initial?: Tenant | null }) {
  const [token, setToken] = useState(initial?.telegram_bot_token ? "••••••••" : "");
  const [chatId, setChatId] = useState(initial?.telegram_ops_chat_id ?? "");
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [webhook, setWebhook] = useState<{ url?: string; pending?: number; ok?: boolean; error?: string } | null>(null);

  async function save() {
    if (!tenantId) return;
    setSaving(true);
    await supabase
      .from("tenants")
      .update({
        ...(token && !token.includes("•") ? { telegram_bot_token: token } : {}),
        telegram_ops_chat_id: chatId,
      })
      .eq("id", tenantId);
    setSaving(false);
  }

  async function registerWebhook() {
    setRegistering(true);
    setWebhook(null);
    const { data, error } = await supabase.functions.invoke("telegram-register", {
      method: "POST",
    });
    setRegistering(false);
    if (error) {
      setWebhook({ ok: false, error: error.message });
      return;
    }
    const r = data as {
      ok: boolean;
      webhook_url?: string;
      telegram?: { description?: string };
      info?: { url?: string; pending_update_count?: number };
      error?: string;
    };
    setWebhook({
      ok: r.ok,
      url: r.info?.url ?? r.webhook_url,
      pending: r.info?.pending_update_count,
      error: r.error ?? r.telegram?.description,
    });
  }

  return (
    <Card>
      <div className="row">
        <IconTile tone="brand"><Send className="h-5 w-5" /></IconTile>
        <CardSubtitle>Bring your own bot via @BotFather or opt into the shared platform bot.</CardSubtitle>
      </div>
      <div className="mt-4 space-y-3">
        <Input
          label="Bot token (BotFather)"
          type="password"
          placeholder="Paste the token from BotFather"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          hint="Stored encrypted at rest. We never expose this to client code."
        />
        <Input
          label="Ops Telegram chat ID"
          placeholder="e.g. -1001234567890"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          hint="Where operational alerts go. Get this from @userinfobot."
        />
      </div>
      <Button block className="mt-4" onClick={save} disabled={saving}>
        <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Telegram config"}
      </Button>

      <div className="mt-5 rounded-2xl border border-ink-900/5 bg-canvas p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-ink-900">Bot webhook</div>
            <div className="text-xs text-ink-500 mt-0.5">
              Tells Telegram where to deliver farmer messages. Run this once after pasting a new token.
            </div>
          </div>
          <Button size="sm" onClick={registerWebhook} disabled={registering}>
            {registering ? "Registering…" : "Register webhook"}
          </Button>
        </div>
        {webhook && (
          <div className={`mt-3 rounded-xl px-3 py-2 text-xs ${webhook.ok ? "bg-brand-50 text-brand-800" : "bg-red-50 text-danger"}`}>
            {webhook.ok ? (
              <>
                ✓ Webhook live · {webhook.pending ?? 0} pending updates
                {webhook.url && <div className="mt-1 break-all text-[11px] text-ink-500">{webhook.url}</div>}
              </>
            ) : (
              <>✗ {webhook.error ?? "Failed to register webhook"}</>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function PricingTab({ tenantId, initial }: { tenantId?: string; initial?: Tenant | null }) {
  const defaults = (initial?.pricing_defaults as Record<string, unknown> | undefined) ?? {};
  const cancellation = (initial?.cancellation_policy as Record<string, unknown> | undefined) ?? {};

  const [baseRate, setBaseRate] = useState<number>(Number(defaults.baseRatePerAcre ?? 600));
  const [travelFree, setTravelFree] = useState<number>(Number(defaults.travelFreeKm ?? 25));
  const [travelPerKm, setTravelPerKm] = useState<number>(Number(defaults.travelPerKm ?? 15));
  const [chemDiff, setChemDiff] = useState<number>(Number(defaults.chemicalIncludedSurchargePerAcre ?? 250));
  const [freeH, setFreeH] = useState<number>(Number(cancellation.freeBeforeHours ?? 24));
  const [halfH, setHalfH] = useState<number>(Number(cancellation.halfBeforeHours ?? 4));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!tenantId) return;
    setSaving(true);
    await supabase
      .from("tenants")
      .update({
        pricing_defaults: {
          baseRatePerAcre: baseRate,
          travelFreeKm: travelFree,
          travelPerKm: travelPerKm,
          chemicalIncludedSurchargePerAcre: chemDiff,
        },
        cancellation_policy: { freeBeforeHours: freeH, halfBeforeHours: halfH, fullWithinHours: halfH },
      })
      .eq("id", tenantId);
    setSaving(false);
  }
  return (
    <Card>
      <div className="row">
        <IconTile tone="brand"><Receipt className="h-5 w-5" /></IconTile>
        <CardSubtitle>Defaults applied to new jobs. Override per job if needed.</CardSubtitle>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Input label="Per-acre rate (₹)" type="number" value={baseRate} onChange={(e) => setBaseRate(Number(e.target.value))} />
        <Input label="Free travel km" type="number" value={travelFree} onChange={(e) => setTravelFree(Number(e.target.value))} />
        <Input label="Travel per km (₹)" type="number" value={travelPerKm} onChange={(e) => setTravelPerKm(Number(e.target.value))} />
        <Input label="Chemical surcharge / ac (₹)" type="number" value={chemDiff} onChange={(e) => setChemDiff(Number(e.target.value))} />
        <Input label="Free cancellation before (h)" type="number" value={freeH} onChange={(e) => setFreeH(Number(e.target.value))} />
        <Input label="50% cancellation before (h)" type="number" value={halfH} onChange={(e) => setHalfH(Number(e.target.value))} />
      </div>
      <Button block className="mt-4" onClick={save} disabled={saving}>
        <Save className="h-4 w-4" /> Save pricing
      </Button>
    </Card>
  );
}

function UsersTab() {
  const { data } = useSupabaseQuery(() =>
    supabase.from("profiles").select("id, full_name, email, phone, role, status").order("full_name"),
  );
  return (
    <Card>
      <CardSubtitle>Users invited to this tenant. Roles control what they can see and do.</CardSubtitle>
      <ul className="mt-3 divide-y divide-ink-900/5">
        {(data ?? []).map((u) => (
          <li key={u.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-ink-900">{u.full_name ?? u.email}</div>
              <div className="text-xs text-ink-500">{u.email}</div>
            </div>
            <Badge tone="brand" className="capitalize">{u.role}</Badge>
          </li>
        ))}
        {(!data || data.length === 0) && (
          <li className="py-6 text-center text-xs text-ink-500">No users yet.</li>
        )}
      </ul>
    </Card>
  );
}

function NotifTab({ tenantId, initial }: { tenantId?: string; initial?: Tenant | null }) {
  const initialPrefs = (initial?.notification_prefs as Record<string, boolean> | undefined) ?? {};
  const [prefs, setPrefs] = useState<Record<string, boolean>>(initialPrefs);
  const [saving, setSaving] = useState(false);
  const categories = [
    ["compliance_block", "Compliance blocks"],
    ["sla_breach", "SLA breaches"],
    ["dispute_opened", "Dispute opened"],
    ["new_enquiry", "New high-priority enquiry"],
    ["incident_reported", "Incident reported"],
  ];
  async function save() {
    if (!tenantId) return;
    setSaving(true);
    await supabase.from("tenants").update({ notification_prefs: prefs }).eq("id", tenantId);
    setSaving(false);
  }
  return (
    <Card>
      <CardSubtitle>Choose which categories trigger Web Push to your admin device.</CardSubtitle>
      <ul className="mt-3 divide-y divide-ink-900/5">
        {categories.map(([k, label]) => (
          <li key={k} className="flex items-center justify-between py-3">
            <span className="text-sm text-ink-900">{label}</span>
            <input
              type="checkbox"
              checked={!!prefs[k]}
              onChange={(e) => setPrefs({ ...prefs, [k]: e.target.checked })}
              className="h-5 w-5 rounded text-brand-700 focus:ring-brand-400"
            />
          </li>
        ))}
      </ul>
      <Button block className="mt-3" onClick={save} disabled={saving}>
        <Save className="h-4 w-4" /> Save preferences
      </Button>
    </Card>
  );
}

function DpdpTab() {
  const { data } = useSupabaseQuery(() =>
    supabase
      .from("consent_records")
      .select("id, farmer_id, profile_id, notice_version, granted, granted_at, revoked_at, delete_requested_at")
      .order("granted_at", { ascending: false })
      .limit(50),
  );
  return (
    <Card>
      <div className="row">
        <IconTile tone="brand"><ShieldCheck className="h-5 w-5" /></IconTile>
        <CardSubtitle>
          DPDP Act 2023 consent records. We honour right-to-delete within 30 days and data export within 14 days.
        </CardSubtitle>
      </div>
      <ul className="mt-3 divide-y divide-ink-900/5">
        {(data ?? []).map((c: any) => (
          <li key={c.id} className="py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-ink-900">
                {c.farmer_id ? "Farmer consent" : "User consent"}
              </div>
              <div className="text-xs text-ink-500">
                Notice {c.notice_version} · granted {new Date(c.granted_at).toLocaleDateString()}
                {c.revoked_at ? ` · revoked` : ""}
                {c.delete_requested_at ? ` · delete requested` : ""}
              </div>
            </div>
            <Badge tone={c.revoked_at ? "danger" : "ok"}>{c.revoked_at ? "Revoked" : "Active"}</Badge>
          </li>
        ))}
        {(!data || data.length === 0) && (
          <li className="py-6 text-center text-xs text-ink-500">No consent records yet.</li>
        )}
      </ul>
    </Card>
  );
}
