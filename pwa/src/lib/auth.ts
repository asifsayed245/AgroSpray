import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Profile = {
  id: string;
  tenant_id: string | null;
  role: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  hydrated: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  hydrated: false,

  signInWithPassword: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) return { error: error.message };
    await get().refresh();
    return { error: null };
  },

  signInWithPhone: async (phone) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithOtp({ phone });
    set({ loading: false });
    return { error: error?.message ?? null };
  },

  verifyPhoneOtp: async (phone, token) => {
    set({ loading: true });
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    set({ loading: false });
    if (error) return { error: error.message };
    await get().refresh();
    return { error: null };
  },

  signUpWithPassword: async (email, password, fullName) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName ?? "" } },
    });
    set({ loading: false });
    if (error) return { error: error.message };
    await get().refresh();
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  refresh: async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session ?? null;
    const user = session?.user ?? null;
    let profile: Profile | null = null;
    if (user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, tenant_id, role, full_name, phone, email")
        .eq("id", user.id)
        .maybeSingle();
      profile = (p as Profile | null) ?? null;
    }
    set({ session, user, profile, hydrated: true });
  },
}));

// Wire global listener — called once at app boot.
export function initAuthSubscription() {
  supabase.auth.onAuthStateChange(async (_event, session) => {
    useAuth.setState({ session, user: session?.user ?? null });
    if (session?.user) await useAuth.getState().refresh();
    else useAuth.setState({ profile: null, hydrated: true });
  });
  void useAuth.getState().refresh();
}
