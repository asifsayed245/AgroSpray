// DJI FlightHub adapter (stub).
// Real integration requires OAuth registration with DJI and a server-side worker
// that polls or subscribes to telemetry; do not call DJI from the browser.

export interface TelemetryPoint {
  t: string; // ISO timestamp
  lat: number;
  lng: number;
  alt_m: number;
  spray_on: boolean;
  spray_volume_l: number;
}

export interface FlightSummary {
  drone_uin: string;
  sortie_ref: string;
  takeoff_at: string;
  landing_at: string;
  duration_s: number;
  area_covered_acres: number;
  volume_sprayed_l: number;
  battery_used_pct: number;
  track: TelemetryPoint[];
  centroid: { lat: number; lng: number };
}

export interface DjiAdapter {
  isConnected(): Promise<boolean>;
  startOAuth(redirectUri: string): Promise<{ authorize_url: string }>;
  listActiveFlights(): Promise<Array<{ drone_uin: string; sortie_ref: string }>>;
  fetchFlightSummary(sortieRef: string): Promise<FlightSummary | null>;
}

export const dji: DjiAdapter = {
  async isConnected() {
    return false;
  },
  async startOAuth(redirectUri) {
    return {
      authorize_url: `https://flighthub.dji.com/oauth/authorize?client_id=mock&redirect_uri=${encodeURIComponent(
        redirectUri,
      )}`,
    };
  },
  async listActiveFlights() {
    return [];
  },
  async fetchFlightSummary(sortieRef) {
    // Deterministic mock summary based on the sortie ref.
    const base = sortieRef
      .split("")
      .reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7) / 0xffffffff;
    const track: TelemetryPoint[] = Array.from({ length: 60 }, (_, i) => ({
      t: new Date(Date.now() - (60 - i) * 30_000).toISOString(),
      lat: 17.95 + base * 0.01 + i * 0.00005,
      lng: 73.91 + base * 0.01 - i * 0.00003,
      alt_m: 8 + Math.sin(i / 6) * 1.2,
      spray_on: i % 6 !== 0,
      spray_volume_l: i % 6 !== 0 ? 0.4 : 0,
    }));
    return {
      drone_uin: "UIN-IN-AS01-T40-001",
      sortie_ref: sortieRef,
      takeoff_at: track[0].t,
      landing_at: track[track.length - 1].t,
      duration_s: 30 * 60,
      area_covered_acres: 6.2,
      volume_sprayed_l: track.reduce((s, p) => s + p.spray_volume_l, 0),
      battery_used_pct: 72,
      track,
      centroid: { lat: track[30].lat, lng: track[30].lng },
    };
  },
};
