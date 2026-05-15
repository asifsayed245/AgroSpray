// Centralised Supabase queries. Pages import from here so we have one place
// to evolve schema/query shape when the DB changes.

import { supabase } from "@/lib/supabase";
import type { Database } from "@/data/db.types";

type JobState = Database["public"]["Enums"]["job_state"];
type AuditSource = Database["public"]["Enums"]["audit_source"];

export type JobRow = {
  id: string;
  number: string;
  crop: string;
  area: number | null;
  area_acres: number;
  scheduled_date: string;
  state: JobState;
  village: string | null;
  spray_type: string | null;
  pesticide_name: string | null;
  assigned_pilot_id: string | null;
  assigned_drone_id: string | null;
  override_reason: string | null;
  pricing_snapshot: { total?: number; subtotal?: number; tax?: number } | null;
  state_history?: unknown;
  reschedule_count?: number;
  farmer: {
    id: string;
    name: string;
    phone: string | null;
    village: string | null;
    district?: string | null;
    state?: string | null;
    default_language?: string;
  } | null;
};

export async function listJobs(opts: { from?: string; to?: string; state?: string } = {}) {
  let q = supabase
    .from("jobs")
    .select(
      "id, number, crop, area_acres, scheduled_date, state, village, pesticide_name, assigned_pilot_id, assigned_drone_id, override_reason, pricing_snapshot, farmer:farmers!farmer_id(id, name, phone, village)",
    )
    .order("scheduled_date", { ascending: true });
  if (opts.from) q = q.gte("scheduled_date", opts.from);
  if (opts.to) q = q.lte("scheduled_date", opts.to);
  if (opts.state) q = q.eq("state", opts.state as JobState);
  return q.returns<JobRow[]>();
}

export async function getJob(id: string) {
  return supabase
    .from("jobs")
    .select(
      "id, number, crop, area, area_acres, scheduled_date, state, village, spray_type, pesticide_name, assigned_pilot_id, assigned_drone_id, override_reason, pricing_snapshot, state_history, reschedule_count, farmer:farmers!farmer_id(id, name, phone, village, district, state, default_language)",
    )
    .eq("id", id)
    .maybeSingle()
    .returns<JobRow | null>();
}

export async function listSortiesForJob(jobId: string) {
  return supabase
    .from("sorties")
    .select(
      "id, sortie_number, state, takeoff_at, landing_at, area_covered_acres, volume_sprayed_l, npnt_permission_ref",
    )
    .eq("job_id", jobId)
    .order("sortie_number");
}

export async function listDrones() {
  return supabase
    .from("drones")
    .select(
      "id, display_id, uin, manufacturer, model, payload_l, hours_flown, hours_since_service, service_threshold_hours, insurance_expiry, status, current_job_id",
    )
    .order("display_id");
}

export async function listPilots() {
  return supabase
    .from("pilots")
    .select(
      "id, name, phone, telegram_id, rpc_number, rpc_expiry, certified_drone_classes, employment_status",
    )
    .order("name");
}

export async function listFarmers(search?: string) {
  let q = supabase.from("farmers").select("id, name, phone, village, district, state").order("name");
  if (search) q = q.ilike("name", `%${search}%`);
  return q.limit(50);
}

export async function listSlots(from: string, to: string) {
  return supabase
    .from("slots")
    .select("id, date, capacity, booked, locked, notes, unavailable")
    .gte("date", from)
    .lte("date", to)
    .order("date");
}

export async function listComplianceBlocks() {
  return supabase
    .from("compliance_checks")
    .select(
      "id, job_id, check_type, status, reason, created_at, job:jobs!job_id(id, number, crop, village, farmer:farmers!farmer_id(name))",
    )
    .eq("status", "fail")
    .order("created_at", { ascending: false })
    .limit(50);
}

export async function listAuditEvents(opts: {
  limit?: number;
  source?: string;
  entityType?: string;
} = {}) {
  let q = supabase
    .from("audit_events")
    .select("id, actor_id, actor_type, source, entity_type, entity_id, event_type, payload, hash, prev_hash, created_at")
    .order("created_at", { ascending: false });
  if (opts.source) q = q.eq("source", opts.source as AuditSource);
  if (opts.entityType) q = q.eq("entity_type", opts.entityType);
  return q.limit(opts.limit ?? 100);
}

export async function getTenant() {
  return supabase
    .from("tenants")
    .select("*")
    .limit(1)
    .maybeSingle();
}

export async function dashboardSummary() {
  // pulled in parallel
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: slots }, { data: blocks }, { data: jobs }] = await Promise.all([
    supabase.from("slots").select("capacity, booked").eq("date", today).limit(1),
    supabase.from("compliance_checks").select("id").eq("status", "fail"),
    supabase
      .from("jobs")
      .select("id, pricing_snapshot, state")
      .eq("scheduled_date", today),
  ]);
  const todaySlot = slots?.[0];
  const revenueToday = (jobs ?? []).reduce((s: number, j) => {
    const p = (j as { pricing_snapshot: { total?: number } | null }).pricing_snapshot;
    return s + (p?.total ?? 0);
  }, 0);
  return {
    slotsBooked: todaySlot?.booked ?? 0,
    slotsCapacity: todaySlot?.capacity ?? 0,
    revenueToday,
    complianceBlocks: blocks?.length ?? 0,
    activeJobs: (jobs ?? []).filter((j) =>
      ["confirmed", "crew_assigned", "in_progress"].includes((j as { state: string }).state),
    ).length,
  };
}

// ---------- RPC wrappers (server-side FSM) ----------

export async function submitJobForCompliance(jobId: string) {
  return supabase.rpc("submit_job_for_compliance", { p_job_id: jobId });
}
export async function assignCrew(jobId: string, pilotId: string, droneId: string) {
  return supabase.rpc("assign_crew", {
    p_job_id: jobId,
    p_pilot_id: pilotId,
    p_drone_id: droneId,
  });
}
export async function completeJob(jobId: string) {
  return supabase.rpc("complete_job", { p_job_id: jobId });
}
export async function cancelJob(jobId: string, reason: string) {
  return supabase.rpc("cancel_job", { p_job_id: jobId, p_reason: reason });
}
export async function overrideState(jobId: string, newState: string, reason: string) {
  return supabase.rpc("override_state", {
    p_job_id: jobId,
    p_new_state: newState as JobState,
    p_reason: reason,
  });
}
export async function ensureSlot(date: string, capacity: number) {
  // Tenant scope inferred by RLS on the function call.
  // Note: the function signature requires p_tenant_id; we expose a server-side
  // wrapper later. For now this is a placeholder that callers can replace once
  // we have a `current_tenant_id()` RPC exposed.
  return supabase.from("slots").upsert(
    {
      date,
      capacity,
      tenant_id: null as unknown as string,
    },
    { onConflict: "tenant_id,date" },
  );
}

// ---------- Chunk A: sortie controls, invoice, reschedule, wishlist ----------

export async function startSortie(jobId: string) {
  return supabase.rpc("start_sortie", { p_job_id: jobId });
}
export async function closeSortie(
  sortieId: string,
  areaCovered: number,
  volumeSprayed: number,
) {
  return supabase.rpc("close_sortie", {
    p_sortie_id: sortieId,
    p_area_covered: areaCovered,
    p_volume_sprayed: volumeSprayed,
  });
}
export async function abortSortie(sortieId: string, reason: string) {
  return supabase.rpc("abort_sortie", { p_sortie_id: sortieId, p_reason: reason });
}

export async function rescheduleJob(jobId: string, newDate: string, reason: string) {
  return supabase.rpc("reschedule_job", {
    p_job_id: jobId,
    p_new_date: newDate,
    p_reason: reason,
  });
}

export async function generateInvoice(jobId: string) {
  return supabase.rpc("generate_invoice", { p_job_id: jobId });
}
export async function markInvoicePaid(invoiceId: string, method: string, reference: string) {
  return supabase.rpc("mark_invoice_paid", {
    p_invoice_id: invoiceId,
    p_method: method,
    p_reference: reference,
  });
}

export type InvoiceRow = {
  id: string;
  job_id: string;
  number: string;
  line_items: unknown;
  subtotal: number;
  tax_total: number;
  total: number;
  upi_qr_payload: string | null;
  paid_at: string | null;
  paid_by_method: string | null;
  paid_reference: string | null;
  created_at: string;
};

export async function getInvoiceForJob(jobId: string) {
  return supabase
    .from("invoices")
    .select("id, job_id, number, line_items, subtotal, tax_total, total, upi_qr_payload, paid_at, paid_by_method, paid_reference, created_at")
    .eq("job_id", jobId)
    .maybeSingle()
    .returns<InvoiceRow | null>();
}

export type WishlistRow = {
  id: string;
  farmer_id: string;
  preferred_date: string;
  crop: string | null;
  area_acres: number | null;
  status: Database["public"]["Enums"]["wishlist_status"];
  notified_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  farmer: { id: string; name: string; phone: string | null; village: string | null } | null;
};

export async function listWishlist() {
  return supabase
    .from("wishlist_entries")
    .select(
      "id, farmer_id, preferred_date, crop, area_acres, status, notified_at, confirmed_at, created_at, farmer:farmers!farmer_id(id, name, phone, village)",
    )
    .order("preferred_date", { ascending: true })
    .returns<WishlistRow[]>();
}

export async function confirmWishlist(wishlistId: string) {
  return supabase.rpc("confirm_wishlist", { p_wishlist_id: wishlistId });
}
export async function cancelWishlist(wishlistId: string, reason: string) {
  return supabase.rpc("cancel_wishlist", { p_wishlist_id: wishlistId, p_reason: reason });
}
