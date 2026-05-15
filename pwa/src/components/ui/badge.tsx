import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("pill", {
  variants: {
    tone: {
      brand: "bg-brand-100 text-brand-800",
      ok: "bg-emerald-50 text-emerald-700",
      warn: "bg-amber-50 text-amber-700",
      danger: "bg-red-50 text-red-700",
      neutral: "bg-ink-900/5 text-ink-700",
      info: "bg-sky-50 text-sky-700",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
