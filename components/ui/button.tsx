"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nsr-blue disabled:opacity-50 disabled:pointer-events-none px-4",
  {
    variants: {
      variant: {
        primary: "bg-nsr-blue text-black hover:bg-[#3db4e6]",
        secondary: "border border-zinc-600 text-white hover:bg-zinc-800",
        ghost: "text-white hover:bg-zinc-800",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3 text-xs",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
