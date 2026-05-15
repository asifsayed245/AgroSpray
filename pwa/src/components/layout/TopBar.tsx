import { ChevronLeft, Bell } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title: string;
  showBack?: boolean;
  unread?: number;
  rightAccessory?: React.ReactNode;
}

export function TopBar({ title, showBack, unread = 0, rightAccessory }: TopBarProps) {
  const nav = useNavigate();
  const loc = useLocation();
  const canBack = showBack ?? loc.pathname !== "/";

  return (
    <header className="sticky top-0 z-30 bg-canvas/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4 sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
        <div className="w-10">
          {canBack && (
            <button
              type="button"
              onClick={() => nav(-1)}
              aria-label="Go back"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card text-ink-900"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>
        <h1 className="text-base font-semibold text-ink-900">{title}</h1>
        <div className="flex w-10 justify-end">
          {rightAccessory ?? (
            <Link
              to="/alerts"
              aria-label={`Alerts${unread ? `, ${unread} unread` : ""}`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card text-ink-900"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span
                  className={cn(
                    "absolute right-2 top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white",
                  )}
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
