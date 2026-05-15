import { NavLink, useNavigate } from "react-router-dom";
import { Home, ClipboardList, Plus, Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/jobs", label: "Jobs", icon: ClipboardList },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/more", label: "More", icon: Menu },
];

export function BottomNav() {
  const nav = useNavigate();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 md:hidden safe-bottom"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-md items-end justify-around bg-white/95 backdrop-blur shadow-[0_-8px_24px_-12px_rgba(15,31,23,0.18)] border-t border-ink-900/5 px-2 pt-1.5 pb-2">
        {items.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavItem key={to} to={to} label={label} Icon={Icon} />
        ))}
        <button
          type="button"
          onClick={() => nav("/new")}
          aria-label="New booking"
          className="-mt-7 inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-700 text-white shadow-pop ring-4 ring-canvas"
        >
          <Plus className="h-6 w-6" />
        </button>
        {items.slice(2).map(({ to, label, icon: Icon }) => (
          <NavItem key={to} to={to} label={label} Icon={Icon} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  to,
  label,
  Icon,
}: {
  to: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium",
          isActive ? "text-brand-700" : "text-ink-400",
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}
