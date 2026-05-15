import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { initAuthSubscription, useAuth } from "@/lib/auth";

let inited = false;

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { hydrated, session } = useAuth();
  const loc = useLocation();

  useEffect(() => {
    if (!inited) {
      inited = true;
      initAuthSubscription();
    }
  }, []);

  if (!hydrated) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-canvas text-ink-500 text-sm">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }

  return <>{children}</>;
}
