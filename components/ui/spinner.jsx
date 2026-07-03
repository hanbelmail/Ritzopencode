"use client"

import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.125em]",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        default: "h-5 w-5",
        lg: "h-8 w-8",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const Spinner = React.forwardRef(({ className, size, label = "Loading", ...props }, ref) => (
  <span
    ref={ref}
    role="status"
    aria-label={label}
    className={cn(spinnerVariants({ size }), className)}
    {...props}>
    <span className="sr-only">{label}</span>
  </span>
))
Spinner.displayName = "Spinner"

export { Spinner, spinnerVariants }
