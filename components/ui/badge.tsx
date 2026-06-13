import * as React from "react";
import { cn } from "@/lib/utils";
import { contrastText } from "@/lib/utils";

// Disposition badge — colors are user-defined hex values, so they are applied
// via inline styles, never hardcoded Tailwind color classes.
export function DispositionBadge({
  label,
  color,
  icon,
  archived,
  className,
}: {
  label: string;
  color: string;
  icon?: string;
  archived?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        className,
      )}
      style={{ backgroundColor: color, color: contrastText(color) }}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {label}
      {archived && <span className="opacity-70">(Archived)</span>}
    </span>
  );
}
