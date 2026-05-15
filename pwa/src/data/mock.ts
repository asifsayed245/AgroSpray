import type { ComplianceBlock, Drone, Job } from "./types";

const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString();
};

export const todaysJobs: Job[] = [
  {
    id: "j-001",
    number: "AGR-AS01-MH-1405-COT-0001",
    farmer: "Ramesh Patil",
    village: "Wai, Satara",
    crop: "Cotton",
    areaAcres: 18,
    date: iso(0),
    state: "In progress",
    pilotName: "Sandeep K.",
    droneId: "T40-A",
    sortieCount: 2,
    sortieTotal: 3,
  },
  {
    id: "j-002",
    number: "AGR-AS01-MH-1405-WHE-0002",
    farmer: "Sunita Deshmukh",
    village: "Phaltan",
    crop: "Wheat",
    areaAcres: 6,
    date: iso(0),
    state: "Crew assigned",
    pilotName: "Anil R.",
    droneId: "T40-B",
  },
  {
    id: "j-003",
    number: "AGR-AS01-MH-1405-SOY-0003",
    farmer: "Vikas Jadhav",
    village: "Karad",
    crop: "Soybean",
    areaAcres: 22,
    date: iso(0),
    state: "Confirmed",
  },
  {
    id: "j-004",
    number: "AGR-AS01-MH-1505-SUG-0007",
    farmer: "Kavita Pawar",
    village: "Koregaon",
    crop: "Sugarcane",
    areaAcres: 14,
    date: iso(1),
    state: "Compliance",
  },
];

export const complianceBlocks: ComplianceBlock[] = [
  {
    jobId: "j-005",
    jobNumber: "AGR-AS01-MH-1505-COT-0010",
    farmer: "Mahesh Kale",
    village: "Mhaswad",
    check: "CIB pesticide",
    reason: "Imidacloprid 17.8% SL not CIB-approved for drone application on cotton.",
    severity: "high",
  },
  {
    jobId: "j-006",
    jobNumber: "AGR-AS01-MH-1605-WHE-0012",
    farmer: "Pooja Shinde",
    village: "Lonand",
    check: "DGCA RPC",
    reason: "Assigned pilot RPC expires 12 May — renewal in progress.",
    severity: "medium",
  },
  {
    jobId: "j-007",
    jobNumber: "AGR-AS01-MH-1605-SOY-0013",
    farmer: "Ganesh More",
    village: "Khatav",
    check: "NPNT",
    reason: "Field overlaps yellow zone — DigitalSky returned conditional approval.",
    severity: "low",
  },
];

export const drones: Drone[] = [
  {
    id: "T40-A",
    uin: "UIN-IN-AS01-T40-001",
    model: "DJI Agras T40",
    status: "In flight",
    hoursFlown: 412,
    hoursSinceService: 28,
    serviceDueIn: 22,
    insuranceExpiry: "2025-11-30",
    payloadL: 40,
    recentDailyHours: [2.2, 3.1, 2.8, 4.0, 3.6, 4.3, 3.8],
    currentJob: "AGR-AS01-MH-1405-COT-0001",
  },
  {
    id: "T40-B",
    uin: "UIN-IN-AS01-T40-002",
    model: "DJI Agras T40",
    status: "Ready",
    hoursFlown: 198,
    hoursSinceService: 12,
    serviceDueIn: 38,
    insuranceExpiry: "2025-09-12",
    payloadL: 40,
    recentDailyHours: [1.4, 2.0, 1.9, 2.7, 3.0, 2.5, 2.9],
  },
  {
    id: "P100-A",
    uin: "UIN-IN-AS01-P100-001",
    model: "XAG P100",
    status: "Maintenance",
    hoursFlown: 304,
    hoursSinceService: 50,
    serviceDueIn: 0,
    insuranceExpiry: "2025-08-04",
    payloadL: 50,
    recentDailyHours: [3.0, 2.6, 3.4, 0, 0, 0, 0],
  },
];

export const summary = {
  slotsBooked: 12,
  slotsCapacity: 20,
  revenueToday: 84500,
  complianceScore: 68,
  unreadAlerts: 4,
};
