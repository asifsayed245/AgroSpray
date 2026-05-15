import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Phone, MapPin, Calendar, CheckCircle2, XCircle, Wheat } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { cancelWishlist, confirmWishlist, listWishlist } from "@/data/queries";

type Tone = "brand" | "warn" | "neutral" | "danger" | "mint";
const TILE_TONE: Record<string, Tone> = {
  waiting: "warn",
  notified: "brand",
  confirmed: "mint",
  cancelled: "neutral",
  expired: "danger",
};
const BADGE_TONE: Record<string, "ok" | "warn" | "neutral" | "danger" | "brand"> = {
  waiting: "warn",
  notified: "brand",
  confirmed: "ok",
  cancelled: "neutral",
  expired: "danger",
};

export default function Wishlist() {
  const nav = useNavigate();
  const wish = useSupabaseQuery(listWishlist, []);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = wish.data ?? [];
  const counts = items.reduce<Record<string, number>>((acc, w) => {
    acc[w.status] = (acc[w.status] ?? 0) + 1;
    return acc;
  }, {});

  async function onConfirm(wishlistId: string) {
    setBusy(wishlistId);
    setError(null);
    const { data, error: e } = await confirmWishlist(wishlistId);
    setBusy(null);
    if (e) {
      setError(e.message);
      return;
    }
    const job = data as { id?: string } | null;
    if (job?.id) nav(`/jobs/${job.id}`);
    else wish.refresh();
  }

  async function onCancel(wishlistId: string) {
    const reason = window.prompt("Cancel reason?", "Farmer dropped out");
    if (!reason) return;
    setBusy(wishlistId);
    setError(null);
    const { error: e } = await cancelWishlist(wishlistId, reason);
    setBusy(null);
    if (e) setError(e.message);
    else wish.refresh();
  }

  return (
    <>
      <TopBar title="Wishlist" />
      <div className="page space-y-3">
        <Card className="bg-brand-gradient text-white p-5 shadow-pop">
          <Heart className="h-5 w-5 mb-2 opacity-80" />
          <h1 className="text-lg font-bold">Wishlist queue ({items.length})</h1>
          <div className="text-sm text-white/90 mt-1">
            Farmers waiting for a slot when capacity is full.
          </div>
        </Card>

        {error && (
          <Card className="border border-red-100 bg-red-50/50">
            <div className="text-sm text-danger">{error}</div>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-3 gap-2 text-center">
            {(["waiting", "notified", "confirmed"] as const).map((s) => (
              <div key={s} className="rounded-xl bg-canvas py-2">
                <div className="text-lg font-bold tnum text-ink-900">{counts[s] ?? 0}</div>
                <div className="text-[11px] text-ink-500 capitalize">{s}</div>
              </div>
            ))}
          </div>
        </Card>

        {wish.loading && <Card>Loading…</Card>}
        {!wish.loading && items.length === 0 && (
          <Card>
            <p className="text-xs text-ink-500 text-center py-3">
              No wishlist entries. When a slot is full, NewJob will offer the farmer this queue.
            </p>
          </Card>
        )}

        {items.map((w) => {
          const canAct = w.status === "waiting" || w.status === "notified";
          return (
            <Card key={w.id}>
              <div className="row">
                <IconTile tone={TILE_TONE[w.status] ?? "neutral"} size="lg">
                  <Heart className="h-5 w-5" />
                </IconTile>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-900 truncate">
                      {w.farmer?.name ?? "Walk-in"}
                    </span>
                    <Badge tone={BADGE_TONE[w.status] ?? "neutral"}>
                      {w.status}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-ink-500 flex items-center gap-2 mt-0.5">
                    <Phone className="h-3 w-3" /> {w.farmer?.phone ?? "—"}
                    {w.farmer?.village && (
                      <>
                        <MapPin className="h-3 w-3" /> {w.farmer.village}
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-canvas px-2 py-1.5">
                  <div className="text-[10px] uppercase text-ink-500 tracking-wide">Date</div>
                  <div className="flex items-center gap-1 font-medium text-ink-900">
                    <Calendar className="h-3 w-3" /> {w.preferred_date}
                  </div>
                </div>
                <div className="rounded-lg bg-canvas px-2 py-1.5">
                  <div className="text-[10px] uppercase text-ink-500 tracking-wide">Crop</div>
                  <div className="flex items-center gap-1 font-medium text-ink-900 capitalize">
                    <Wheat className="h-3 w-3" /> {w.crop ?? "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-canvas px-2 py-1.5">
                  <div className="text-[10px] uppercase text-ink-500 tracking-wide">Area</div>
                  <div className="font-medium text-ink-900 tnum">
                    {w.area_acres ?? "—"} ac
                  </div>
                </div>
              </div>
              {canAct && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    block
                    disabled={busy === w.id}
                    onClick={() => onConfirm(w.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Confirm
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    block
                    disabled={busy === w.id}
                    onClick={() => onCancel(w.id)}
                  >
                    <XCircle className="h-4 w-4" /> Cancel
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
