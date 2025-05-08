import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex w-full min-w-0 rounded-md border text-neutral-300 bg-transparent px-3 py-2 text-base shadow-xs transition-all outline-none placeholder:text-neutral-200 disabled:pointer-events-none disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium",
  {
    variants: {
      variant: {
        default: 
          "border-neutral-200 focus:border-success-50 focus:ring-2 focus:ring-success-50/20",
        error: 
          "border-error-50 focus:border-error-100 focus:ring-2 focus:ring-error-50/20",
        success: 
          "border-success-50 focus:border-success-50 focus:ring-2 focus:ring-success-50/20",
      },
      size: {
        sm: "h-8 text-sm px-2 py-1",
        default: "h-10",
        lg: "h-12 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps 
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
    variant?: "default" | "error" | "success"
    size?: "sm" | "default" | "lg"
  }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// eslint-disable-next-line react-refresh/only-export-components
export { Input, inputVariants }