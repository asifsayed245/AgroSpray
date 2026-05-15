// CIB pesticide registry adapter.
// V1 uses the local `pesticides_cib` table as the source — kept as an adapter
// so we can swap to a real CIB feed/scraper later without touching callers.

import { supabase } from "@/lib/supabase";

export interface CibCheckResult {
  approved: boolean;
  pesticide?: {
    name: string;
    brand: string | null;
    active_ingredient: string | null;
    drone_approved: boolean;
    phi_days?: number;
  };
  reason?: string;
}

export interface CibAdapter {
  check(name: string, crop: string, harvestDate?: Date): Promise<CibCheckResult>;
  suggestAlternatives(crop: string): Promise<
    Array<{ name: string; brand: string | null; active_ingredient: string | null }>
  >;
}

export const cib: CibAdapter = {
  async check(name, crop, harvestDate) {
    const { data, error } = await supabase
      .from("pesticides_cib")
      .select("name, brand, active_ingredient, approved_crops, drone_approved, phi_days_by_crop")
      .ilike("name", name)
      .maybeSingle();

    if (error || !data) return { approved: false, reason: "Not found in CIB registry" };

    if (!data.drone_approved)
      return {
        approved: false,
        pesticide: { ...data, phi_days: undefined },
        reason: "Not CIB-approved for drone application",
      };

    if (!data.approved_crops?.includes(crop.toLowerCase()))
      return {
        approved: false,
        pesticide: { ...data, phi_days: undefined },
        reason: `Not approved for crop "${crop}"`,
      };

    const phi = (data.phi_days_by_crop as Record<string, number>)?.[crop.toLowerCase()];
    if (harvestDate && phi != null) {
      const earliestSpray = new Date(harvestDate);
      earliestSpray.setDate(earliestSpray.getDate() - phi);
      if (Date.now() > earliestSpray.getTime())
        return {
          approved: false,
          pesticide: { ...data, phi_days: phi },
          reason: `Pre-harvest interval is ${phi} days — would violate PHI for the stated harvest date`,
        };
    }

    return { approved: true, pesticide: { ...data, phi_days: phi } };
  },

  async suggestAlternatives(crop) {
    const { data } = await supabase
      .from("pesticides_cib")
      .select("name, brand, active_ingredient, approved_crops")
      .eq("drone_approved", true)
      .contains("approved_crops", [crop.toLowerCase()])
      .limit(5);
    return (data ?? []).map((r) => ({
      name: r.name,
      brand: r.brand,
      active_ingredient: r.active_ingredient,
    }));
  },
};
