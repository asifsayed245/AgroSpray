import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-ink-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-12 w-full rounded-2xl border border-ink-900/8 bg-white px-4 text-sm text-ink-900 placeholder:text-ink-400",
            "focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/70",
            error && "border-danger focus:border-danger focus:ring-red-100",
            className,
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);
Input.displayName = "Input";
