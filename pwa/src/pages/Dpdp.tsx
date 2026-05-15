import { useState } from "react";
import { ShieldCheck, Download, Trash2, FileText } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const NOTICE = `AgroSpray collects: your name, phone, email, location, crop, booking and payment history,
and (for pilots) RPC and Telegram ID. We use this data to operate the spray service you book
or run, to maintain DGCA-compliant flight records, and to bill you. Data is stored in India
(Mumbai region). You can request a copy or deletion at any time.`;

export default function Dpdp() {
  const { profile } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function requestExport() {
    setExporting(true);
    setResult(null);
    if (profile)
      await supabase.from("consent_records").update({ export_requested_at: new Date().toISOString() })
        .eq("profile_id", profile.id);
    setExporting(false);
    setResult("Export requested. You'll receive a JSON of your data within 14 days.");
  }

  async function requestDelete() {
    if (!confirm("This sends a delete request. Operational records will be anonymised within 30 days.")) return;
    setRequesting(true);
    setResult(null);
    if (profile)
      await supabase.from("consent_records").update({ delete_requested_at: new Date().toISOString() })
        .eq("profile_id", profile.id);
    setRequesting(false);
    setResult("Deletion requested. We will fulfill within 30 days per DPDP Act 2023.");
  }

  return (
    <>
      <TopBar title="Privacy & DPDP" />
      <div className="page space-y-3">
        <Card>
          <div className="row">
            <IconTile tone="brand"><ShieldCheck className="h-5 w-5" /></IconTile>
            <div>
              <div className="text-sm font-semibold text-ink-900">Your data rights</div>
              <div className="text-xs text-ink-500">India's DPDP Act 2023</div>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-700 whitespace-pre-line">{NOTICE}</p>
        </Card>

        <Card>
          <div className="row">
            <IconTile tone="brand" size="sm"><Download className="h-4 w-4" /></IconTile>
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink-900">Export my data</div>
              <div className="text-xs text-ink-500">JSON within 14 days</div>
            </div>
            <Button size="sm" onClick={requestExport} disabled={exporting}>Request</Button>
          </div>
        </Card>

        <Card>
          <div className="row">
            <IconTile tone="danger" size="sm"><Trash2 className="h-4 w-4" /></IconTile>
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink-900">Delete my personal data</div>
              <div className="text-xs text-ink-500">Operational records anonymised, fulfilled in 30 days</div>
            </div>
            <Button size="sm" variant="danger" onClick={requestDelete} disabled={requesting}>Request</Button>
          </div>
        </Card>

        <Card>
          <div className="row">
            <IconTile tone="neutral" size="sm"><FileText className="h-4 w-4" /></IconTile>
            <div>
              <div className="text-sm font-semibold text-ink-900">Full privacy notice</div>
              <div className="text-xs text-ink-500">Version 1.0 · effective {new Date().toISOString().slice(0,10)}</div>
            </div>
          </div>
        </Card>

        {result && (
          <Card className="border border-emerald-100 bg-emerald-50/50">
            <div className="text-sm text-emerald-800">{result}</div>
          </Card>
        )}
      </div>
    </>
  );
}
