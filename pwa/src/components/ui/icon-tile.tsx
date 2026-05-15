import * as React from "react";
import { cn } from "@/lib/utils";

interface IconTileProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  tone?: "brand" | "mint" | "neutral" | "warn" | "danger";
}

const sizes = { sm: "h-9 w-9", md: "h-11 w-11", lg: "h-14 w-14" };
const tones = {
  brand: "bg-brand-100 text-brand-800",
  mint: "bg-mint-200/60 text-brand-800",
  neutral: "bg-ink-900/5 text-ink-700",
  warn: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
};

export function IconTile({
  className,
  size = "md",
  tone = "brand",
  children,
  ...rest
}: IconTileProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-2xl shrink-0",
        sizes[size],
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
