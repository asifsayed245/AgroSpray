import { useEffect, useState } from "react";
import { Bell, BellRing, AlertCircle, CheckCircle2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTile } from "@/components/ui/icon-tile";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type N = {
  id: string;
  category: string;
  title: string | null;
  body: string | null;
  delivery_status: string;
  created_at: string;
};

export default function Alerts() {
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    setLoading(true);
    supabase
      .from("notifications")
      .select("id, category, title, body, delivery_status, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setItems((data ?? []) as N[]);
        setLoading(false);
      });
    if ("Notification" in window) setPushPermission(Notification.permission);
  }, []);

  async function subscribePush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      alert("Push not supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission !== "granted") return;

    // For real production, the VAPID public key would come from env and the
    // subscription is posted to a Supabase edge function that stores it.
    // Here we just register the SW and confirm the subscription locally.
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      alert("Already subscribed.");
      return;
    }
    alert(
      "Push permission granted. The real VAPID-signed subscription is wired server-side in a later step.",
    );
  }

  return (
    <>
      <TopBar title="Alerts" />
      <div className="page space-y-3">
        <Card className="bg-brand-soft border-0">
          <div className="row">
            <IconTile tone="brand"><BellRing className="h-5 w-5" /></IconTile>
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink-900">Web Push</div>
              <div className="text-xs text-ink-700">
                Allow notifications to receive compliance blocks, SLA breaches, and incident alerts even
                when the app is closed.
              </div>
            </div>
            <Button size="sm" onClick={subscribePush} disabled={pushPermission === "granted"}>
              {pushPermission === "granted" ? "Subscribed" : "Allow"}
            </Button>
          </div>
        </Card>

        {loading && <Card>Loading…</Card>}
        {!loading && items.length === 0 && (
          <Card className="flex flex-col items-center text-center py-8 gap-2">
            <CheckCircle2 className="h-8 w-8 text-ok" />
            <div className="text-sm font-semibold text-ink-900">All caught up</div>
            <div className="text-xs text-ink-500">No notifications yet.</div>
          </Card>
        )}

        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <Card>
                <div className="row">
                  <IconTile
                    tone={
                      n.category === "incident_reported" ? "danger"
                      : n.category === "weather.warning" ? "warn"
                      : n.category === "compliance_block" ? "warn"
                      : "brand"
                    }
                    size="sm"
                  >
                    {n.category === "incident_reported" ? <AlertCircle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </IconTile>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink-900 truncate">
                        {n.title ?? n.category.replace("_", " ")}
                      </span>
                      <Badge tone={n.delivery_status === "delivered" ? "ok" : "neutral"}>
                        {n.delivery_status}
                      </Badge>
                    </div>
                    <div className="text-xs text-ink-500 line-clamp-2">{n.body ?? ""}</div>
                    <div className="text-[10px] text-ink-400 mt-1">
                      {new Date(n.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
