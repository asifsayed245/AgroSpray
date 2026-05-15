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

// Fetch the user's profile row in the background — never blocks UI hydration
// or sign-in completion. If it fails, the app still works (profile is optional).
function loadProfileInBackground(userId: string) {
  supabase
    .from("profiles")
    .select("id, tenant_id, role, full_name, phone, email")
    .eq("id", userId)
    .maybeSingle()
    .then(({ data }) => {
      useAuth.setState({ profile: (data as Profile | null) ?? null });
    }, () => {
      // swallow — profile is non-critical for navigation
    });
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  loading: false,
  hydrated: false,

  signInWithPassword: async (email, password) => {
    set({ loading: true });
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<{ data: null; error: { message: string } }>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Sign-in timed out after 15s. Check your connection and try again.",
                ),
              ),
            15000,
          ),
        ),
      ]);
      set({ loading: false });
      if (result.error) return { error: result.error.message };
      // Use session directly from the response — avoids calling getSession() again
      // which would serialize behind any in-flight auth operations.
      const session = result.data?.session ?? null;
      const user = result.data?.user ?? null;
      set({ session, user, hydrated: true });
      if (user) loadProfileInBackground(user.id);
      return { error: null };
    } catch (e) {
      set({ loading: false });
      return { error: (e as Error).message ?? "Sign-in failed" };
    }
  },

  signInWithPhone: async (phone) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithOtp({ phone });
    set({ loading: false });
    return { error: error?.message ?? null };
  },

  verifyPhoneOtp: async (phone, token) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    set({ loading: false });
    if (error) return { error: error.message };
    const session = data?.session ?? null;
    const user = data?.user ?? null;
    set({ session, user, hydrated: true });
    if (user) loadProfileInBackground(user.id);
    return { error: null };
  },

  signUpWithPassword: async (email, password, fullName) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName ?? "" } },
    });
    set({ loading: false });
    if (error) return { error: error.message };
    const session = data?.session ?? null;
    const user = data?.user ?? null;
    set({ session, user, hydrated: true });
    if (user) loadProfileInBackground(user.id);
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  refresh: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session ?? null;
      const user = session?.user ?? null;
      set({ session, user, hydrated: true });
      if (user) loadProfileInBackground(user.id);
    } catch (e) {
      console.warn("[auth] refresh failed:", e);
      set({ session: null, user: null, profile: null, hydrated: true });
    }
  },
}));

// Wire global listener — called once at app boot.
// Important: we rely entirely on the listener (which fires `INITIAL_SESSION`
// synchronously after subscribe with the cached session from localStorage).
// We deliberately do NOT call `getSession()` proactively, because that takes
// the supabase-js internal auth lock and can cause a later `signInWithPassword`
// to serialize behind it and hang for the user. See:
// https://github.com/supabase/supabase-js/issues/676
export function initAuthSubscription() {
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    useAuth.setState({ session, user, hydrated: true });
    if (user) loadProfileInBackground(user.id);
    else useAuth.setState({ profile: null });
  });

  // Belt-and-braces watchdog: if the listener somehow never fires `INITIAL_SESSION`
  // (e.g. SDK in a broken state), unblock the UI after 4s so the user can reach login.
  setTimeout(() => {
    if (!useAuth.getState().hydrated) {
      console.warn("[auth] watchdog: forcing logged-out state");
      useAuth.setState({
        hydrated: true,
        session: null,
        user: null,
        profile: null,
      });
    }
  }, 4000);
}
