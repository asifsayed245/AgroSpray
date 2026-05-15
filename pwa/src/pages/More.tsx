import { Link } from "react-router-dom";
import {
  Users,
  Plane,
  ShieldCheck,
  ScrollText,
  Settings,
  CalendarRange,
  ShieldAlert,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { useAuth } from "@/lib/auth";

const SECTIONS: Array<{
  to: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { to: "/pilots", label: "Pilots", hint: "Roster, RPC expiry", icon: Users },
  { to: "/fleet", label: "Drone fleet", hint: "UIN, status, telemetry", icon: Plane },
  { to: "/compliance", label: "Compliance", hint: "DGCA · CIB · NPNT", icon: ShieldCheck },
  { to: "/slots", label: "Slot manager", hint: "Daily capacity", icon: CalendarRange },
  { to: "/audit", label: "Audit log", hint: "Append-only, hash-chained", icon: ScrollText },
  { to: "/dpdp", label: "Privacy & DPDP", hint: "Consent · export · delete", icon: ShieldAlert },
  { to: "/settings", label: "Settings", hint: "Business · pricing · users", icon: Settings },
];

export default function More() {
  const { profile, signOut } = useAuth();
  return (
    <>
      <TopBar title="More" />
      <div className="page space-y-3">
        <Card>
          <div className="row">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white font-bold">
              {(profile?.full_name ?? profile?.email ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink-900">{profile?.full_name ?? "—"}</div>
              <div className="text-xs text-ink-500 truncate">{profile?.email ?? profile?.phone ?? "—"}</div>
              <div className="mt-0.5 text-[11px] capitalize text-ink-500">{profile?.role}</div>
            </div>
            <button
              type="button"
              aria-label="Sign out"
              onClick={() => signOut()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </Card>

        <Card className="p-0">
          <ul className="divide-y divide-ink-900/5">
            {SECTIONS.map(({ to, label, hint, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className="flex items-center gap-3 px-4 py-3 active:bg-ink-900/3">
                  <IconTile tone="brand" size="sm"><Icon className="h-4 w-4" /></IconTile>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink-900">{label}</div>
                    <div className="text-xs text-ink-500">{hint}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-400" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
