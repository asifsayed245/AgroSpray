import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function compactNumber(n: number) {
  return new Intl.NumberFormat("en-IN", { notation: "compact" }).format(n);
}

export function dayLabel(d: Date) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(d);
}
