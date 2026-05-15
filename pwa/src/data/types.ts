export type JobState =
  | "Draft"
  | "Compliance"
  | "Confirmed"
  | "Crew assigned"
  | "In progress"
  | "Complete"
  | "Invoiced"
  | "Paid"
  | "Wishlist"
  | "Comp. fail"
  | "Cancelled"
  | "Failed"
  | "Disputed";

export type ComplianceCheck = "DGCA UIN" | "DGCA RPC" | "CIB pesticide" | "NPNT" | "Pricing";

export interface Job {
  id: string;
  number: string;
  farmer: string;
  village: string;
  crop: string;
  areaAcres: number;
  date: string; // ISO
  state: JobState;
  pilotName?: string;
  droneId?: string;
  sortieCount?: number;
  sortieTotal?: number;
}

export interface ComplianceBlock {
  jobId: string;
  jobNumber: string;
  farmer: string;
  village: string;
  check: ComplianceCheck;
  reason: string;
  severity: "high" | "medium" | "low";
}

export type DroneStatus = "Ready" | "In flight" | "Maintenance" | "Out of service";

export interface Drone {
  id: string;
  uin: string;
  model: string;
  status: DroneStatus;
  hoursFlown: number;
  hoursSinceService: number;
  serviceDueIn: number;
  insuranceExpiry: string;
  payloadL: number;
  recentDailyHours: number[]; // for sparkline
  currentJob?: string;
}
