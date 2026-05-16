import { NavLink } from "react-router-dom";
import {
  Home,
  ClipboardList,
  Heart,
  MessageSquare,
  ShieldCheck,
  Plane,
  Users,
  ScrollText,
  Settings,
  CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/jobs", label: "Jobs", icon: ClipboardList },
  { to: "/slots", label: "Slot manager", icon: CalendarRange },
  { to: "/queries", label: "Queries", icon: MessageSquare },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/fleet", label: "Drone fleet", icon: Plane },
  { to: "/pilots", label: "Pilots", icon: Users },
  { to: "/audit", label: "Audit log", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function SideNav() {
  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:gap-1 md:border-r md:border-ink-900/5 md:bg-white md:px-4 md:py-6">
      <div className="mb-6 flex items-center gap-2 px-2">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white font-bold">
          A
        </div>
        <div>
          <div className="text-sm font-semibold text-ink-900">AgroSpray</div>
          <div className="text-xs text-ink-500">Admin console</div>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5" aria-label="Sections">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-50 text-brand-800"
                  : "text-ink-700 hover:bg-ink-900/5",
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
