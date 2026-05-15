import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  label: string;
  primary: string;
  caption?: string;
  href?: string;
  hrefLabel?: string;
}

/**
 * The hero balance-style card from the reference design — large headline value
 * sitting on the brand gradient. We use it for slot utilisation on the dashboard
 * and fleet stats on the fleet page.
 */
export function PrimaryStatCard({ label, primary, caption, href, hrefLabel }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-5 text-white shadow-pop">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-mint-400/30 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-mint-300" />
            {label}
          </div>
          <div className="tnum mt-3 text-3xl font-extrabold tracking-tight">{primary}</div>
          {caption && <div className="mt-1 text-xs text-white/80">{caption}</div>}
        </div>
        {href && (
          <Link
            to={href}
            className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/25"
          >
            {hrefLabel ?? "Open"} <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
