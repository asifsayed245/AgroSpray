import { cn } from "@/lib/utils";

interface StatArcProps {
  /** 0–100 value */
  value: number;
  label?: string;
  caption?: string;
  /** Width/height of the SVG box. */
  size?: number;
  className?: string;
}

/**
 * Semicircular gauge with red → yellow → green gradient arc and a marker
 * indicating the current value. Mirrors the credit-score widget in the
 * reference design.
 */
export function StatArc({
  value,
  label = "Score",
  caption,
  size = 220,
  className,
}: StatArcProps) {
  const v = Math.max(0, Math.min(100, value));
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const arcLen = Math.PI * radius;
  // value as fraction along the half-circle (180° sweep from 180° → 360°)
  const angleDeg = 180 + (v / 100) * 180;
  const angleRad = (angleDeg * Math.PI) / 180;
  const mx = cx + radius * Math.cos(angleRad);
  const my = cy + radius * Math.sin(angleRad);

  // Tone label by value, mirroring "Poor / Fair / Good / Excellent".
  const tone =
    v < 35 ? "Critical" : v < 60 ? "At risk" : v < 80 ? "Healthy" : "Excellent";

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <svg width={size} height={size / 2 + stroke} viewBox={`0 0 ${size} ${size / 2 + stroke}`}>
        <defs>
          <linearGradient id="arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="65%" stopColor="#84CC16" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
        {/* Track */}
        <path
          d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
          stroke="#EEF2EE"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
        {/* Gradient arc */}
        <path
          d={`M ${stroke / 2} ${cy} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${cy}`}
          stroke="url(#arc-gradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${arcLen} ${arcLen}`}
          strokeDashoffset={arcLen - (v / 100) * arcLen}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
        {/* Marker dot */}
        <circle cx={mx} cy={my} r={stroke / 2 + 4} fill="white" />
        <circle cx={mx} cy={my} r={stroke / 2 - 2} fill="#0B5D3B" />
      </svg>

      <div className="absolute inset-x-0 top-[42%] flex flex-col items-center">
        <span className="text-xs uppercase tracking-wide text-ink-500">{label}</span>
        <span className="tnum text-5xl font-extrabold text-ink-900 leading-none mt-1">
          {Math.round(v)}
        </span>
        <span className="mt-1 text-sm font-medium text-ink-500">{caption ?? tone}</span>
      </div>
    </div>
  );
}
