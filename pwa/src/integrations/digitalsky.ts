// DGCA DigitalSky adapter (stub).
// Replace with a real client once you have DGCA API credentials and a server
// that proxies the calls (don't call DigitalSky directly from the browser).

export interface OperatorUinResult {
  valid: boolean;
  operator?: { name: string; uin: string; state: string; expires_on: string };
  reason?: string;
}

export interface PilotRpcResult {
  valid: boolean;
  pilot?: { name: string; rpc: string; classes: string[]; expires_on: string };
  reason?: string;
}

export interface NpntPermissionRequest {
  pilot_rpc: string;
  drone_uin: string;
  takeoff: { lat: number; lng: number };
  envelope_polygon: Array<[number, number]>;
  planned_altitude_ft: number;
  planned_duration_min: number;
}

export interface NpntPermissionGrant {
  granted: boolean;
  permission_ref?: string;
  zone?: "green" | "yellow" | "red";
  conditions?: string[];
  reason?: string;
}

export interface DigitalSkyAdapter {
  validateOperatorUin(uin: string): Promise<OperatorUinResult>;
  validatePilotRpc(rpc: string): Promise<PilotRpcResult>;
  requestNpntPermission(req: NpntPermissionRequest): Promise<NpntPermissionGrant>;
}

export const digitalSky: DigitalSkyAdapter = {
  async validateOperatorUin(uin) {
    if (!/^UIN-IN-[A-Z0-9-]+$/.test(uin)) {
      return { valid: false, reason: "Format invalid — expected UIN-IN-…" };
    }
    return {
      valid: true,
      operator: {
        name: "AgroSpray Demo Operator",
        uin,
        state: "Maharashtra",
        expires_on: new Date(Date.now() + 365 * 86400e3).toISOString().slice(0, 10),
      },
    };
  },

  async validatePilotRpc(rpc) {
    if (!/^RPC-IN-\d+$/.test(rpc)) {
      return { valid: false, reason: "Format invalid — expected RPC-IN-…" };
    }
    return {
      valid: true,
      pilot: {
        name: "Demo Pilot",
        rpc,
        classes: ["medium", "large"],
        expires_on: new Date(Date.now() + 220 * 86400e3).toISOString().slice(0, 10),
      },
    };
  },

  async requestNpntPermission(req) {
    // Deterministic mock: red zone if lat is near a "no-fly" hotspot.
    const isRedZone = Math.abs(req.takeoff.lat - 28.6) < 0.05; // mock Delhi exclusion
    if (isRedZone) {
      return {
        granted: false,
        zone: "red",
        reason: "Takeoff coordinates fall inside a red zone (mocked)",
      };
    }
    return {
      granted: true,
      zone: req.planned_altitude_ft > 200 ? "yellow" : "green",
      permission_ref: `NPNT-DS-${Math.floor(Math.random() * 1e6)
        .toString()
        .padStart(6, "0")}`,
      conditions:
        req.planned_altitude_ft > 200
          ? ["Maintain visual line-of-sight", "Notify local ATC"]
          : [],
    };
  },
};
