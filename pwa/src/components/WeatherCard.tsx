import { useState, useEffect } from "react";
import { Cloud, Wind, Droplets, RefreshCw, AlertTriangle, CheckCircle2, XCircle, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupabaseQuery } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/lib/supabase";
import {
  getLatestWeatherForJob,
  refreshWeatherForJob,
  type WeatherDay,
  type WeatherSafety,
  type WeatherSnapshot,
} from "@/data/queries";

// Accepts: "18.5, 73.9", "lat=18.5 lng=73.9", Google Maps URLs like
//   https://www.google.com/maps/@18.51,73.91,15z
//   https://maps.google.com/?q=18.51,73.91
//   https://goo.gl/maps/... (won't parse; user needs to expand)
function parseCoords(raw: string): { lat: number; lng: number } | null {
  if (!raw) return null;
  const matches = raw.match(/-?\d+(?:\.\d+)?/g);
  if (!matches || matches.length < 2) return null;
  // Find the first two numbers that look like a sensible lat/lng pair.
  for (let i = 0; i < matches.length - 1; i++) {
    const a = parseFloat(matches[i]);
    const b = parseFloat(matches[i + 1]);
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180 && !(a === 0 && b === 0)) {
      return { lat: a, lng: b };
    }
  }
  return null;
}

const SAFETY_LABEL: Record<WeatherSafety, string> = {
  good: "Spray-safe",
  marginal: "Marginal",
  unsafe: "Unsafe",
};
const SAFETY_TONE: Record<WeatherSafety, "ok" | "warn" | "danger"> = {
  good: "ok",
  marginal: "warn",
  unsafe: "danger",
};
const SAFETY_DOT: Record<WeatherSafety, string> = {
  good: "bg-mint-500",
  marginal: "bg-amber-500",
  unsafe: "bg-red-500",
};
const SAFETY_TEXT_COLOR: Record<WeatherSafety, string> = {
  good: "text-mint-700",
  marginal: "text-amber-700",
  unsafe: "text-red-700",
};
const SAFETY_BG: Record<WeatherSafety, string> = {
  good: "bg-mint-50/60 border-mint-200",
  marginal: "bg-amber-50/60 border-amber-200",
  unsafe: "bg-red-50/60 border-red-200",
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function weekday(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });
}
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function WeatherCard({
  jobId,
  bookingDate,
  village,
}: {
  jobId: string;
  bookingDate: string;
  village?: string | null;
}) {
  const q = useSupabaseQuery(() => getLatestWeatherForJob(jobId), [jobId]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noLocation, setNoLocation] = useState(false);
  const [coordsInput, setCoordsInput] = useState("");
  const [savingCoords, setSavingCoords] = useState(false);
  const [coordsError, setCoordsError] = useState<string | null>(null);

  const snap = q.data as WeatherSnapshot | null;

  // If we have no snapshot at all, trigger an initial fetch.
  useEffect(() => {
    if (!q.loading && !snap && !refreshing && !error) {
      void doRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.loading]);

  async function doRefresh() {
    setRefreshing(true);
    setError(null);
    setNoLocation(false);
    const { data, error: e } = await refreshWeatherForJob(jobId);
    setRefreshing(false);
    if (e) {
      setError(e.message);
      return;
    }
    const r = data as { status?: string } | null;
    if (r?.status === "no_location") {
      setNoLocation(true);
      return;
    }
    q.refresh();
  }

  if (q.loading || (refreshing && !snap)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weather</CardTitle>
          <Cloud className="h-4 w-4 text-brand-700" />
        </CardHeader>
        <p className="text-xs text-ink-500">Fetching forecast…</p>
      </Card>
    );
  }

  async function saveCoords() {
    const parsed = parseCoords(coordsInput);
    if (!parsed) {
      setCoordsError("Couldn't read coordinates. Try \"18.51, 73.92\" or a Google Maps link.");
      return;
    }
    setSavingCoords(true);
    setCoordsError(null);
    const { error: e } = await supabase
      .from("jobs")
      .update({ location_lat: parsed.lat, location_lng: parsed.lng })
      .eq("id", jobId);
    if (e) {
      setSavingCoords(false);
      setCoordsError(e.message);
      return;
    }
    setNoLocation(false);
    setCoordsInput("");
    await doRefresh();
    setSavingCoords(false);
  }

  if (noLocation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weather</CardTitle>
          <MapPin className="h-4 w-4 text-amber-700" />
        </CardHeader>
        <div className="rounded-xl bg-amber-50/60 border border-amber-100 px-3 py-2 text-xs text-amber-800">
          {village
            ? <>Couldn't find <span className="font-medium">"{village}"</span> on the map. Set coordinates manually below.</>
            : "No location set for this job. Paste coordinates below to see weather."}
        </div>
        <div className="mt-3 space-y-2">
          <Input
            label="Coordinates or Google Maps link"
            placeholder="18.51, 73.92  —  or paste a maps.google.com URL"
            value={coordsInput}
            onChange={(e) => setCoordsInput(e.target.value)}
            hint="Open Google Maps → long-press the field → copy the lat/lng row, paste here."
          />
          {coordsError && (
            <div className="rounded-xl bg-red-50/60 border border-red-100 px-3 py-2 text-xs text-danger">
              {coordsError}
            </div>
          )}
          <Button size="sm" block disabled={savingCoords || !coordsInput.trim()} onClick={saveCoords}>
            {savingCoords ? "Saving…" : "Save & fetch weather"}
          </Button>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weather</CardTitle>
          <Cloud className="h-4 w-4 text-brand-700" />
        </CardHeader>
        <div className="rounded-xl bg-red-50/60 border border-red-100 px-3 py-2 text-xs text-danger">
          {error}
        </div>
        <Button size="sm" className="mt-2" onClick={doRefresh} disabled={refreshing}>
          <RefreshCw className="h-3 w-3" /> Retry
        </Button>
      </Card>
    );
  }

  if (!snap) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weather</CardTitle>
          <Cloud className="h-4 w-4 text-brand-700" />
        </CardHeader>
        <Button size="sm" onClick={doRefresh} disabled={refreshing}>
          <RefreshCw className="h-3 w-3" /> Fetch forecast
        </Button>
      </Card>
    );
  }

  const safety = snap.booking_date_safety;
  const SafetyIcon = safety === "good" ? CheckCircle2 : safety === "marginal" ? AlertTriangle : XCircle;
  const days: WeatherDay[] = (snap.daily ?? []) as WeatherDay[];
  const bookingDay = days.find((d) => d.date === bookingDate);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weather</CardTitle>
        <Button variant="ghost" size="sm" onClick={doRefresh} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>

      <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${SAFETY_BG[safety]}`}>
        <SafetyIcon className={`h-5 w-5 ${SAFETY_TEXT_COLOR[safety]}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold ${SAFETY_TEXT_COLOR[safety]}`}>
            {SAFETY_LABEL[safety]} for {shortDate(bookingDate)}
          </div>
          {bookingDay && (
            <div className="text-[11px] text-ink-700 mt-0.5">
              wind {Math.round(bookingDay.wind_max)} km/h · rain {bookingDay.rain_pct}% ·{" "}
              {Math.round(bookingDay.t_min)}–{Math.round(bookingDay.t_max)}°C
            </div>
          )}
        </div>
        <Badge tone={SAFETY_TONE[safety]}>{SAFETY_LABEL[safety]}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isBooking = d.date === bookingDate;
          return (
            <div
              key={d.date}
              className={`rounded-lg border px-1 py-1.5 text-center text-[10px] ${
                isBooking
                  ? `border-brand-600 ${SAFETY_BG[d.safety]} shadow-pop`
                  : "border-ink-900/5 bg-canvas"
              }`}
            >
              <div className="text-ink-500 truncate">{weekday(d.date)}</div>
              <div className="font-semibold text-ink-900 tnum">{shortDate(d.date)}</div>
              <div className="mt-0.5 flex items-center justify-center gap-0.5 text-[9px] text-ink-500">
                <Wind className="h-2.5 w-2.5" /> {Math.round(d.wind_max)}
              </div>
              <div className="flex items-center justify-center gap-0.5 text-[9px] text-ink-500">
                <Droplets className="h-2.5 w-2.5" /> {d.rain_pct}%
              </div>
              <div className="text-[9px] text-ink-700 tnum">
                {Math.round(d.t_min)}–{Math.round(d.t_max)}°
              </div>
              <div className={`mt-1 mx-auto h-1.5 w-1.5 rounded-full ${SAFETY_DOT[d.safety]}`} />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-ink-500">
        <span>{snap.source} · {snap.lat.toFixed(2)}, {snap.lng.toFixed(2)}</span>
        <span>updated {relativeTime(snap.fetched_at)}</span>
      </div>
    </Card>
  );
}
