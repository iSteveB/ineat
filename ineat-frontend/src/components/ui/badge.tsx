import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-neutral-200 text-neutral-300 hover:bg-neutral-200/80',
        secondary: 'border-transparent bg-neutral-100 text-neutral-200 hover:bg-neutral-100/80',
        destructive: 'border-transparent bg-error-500 text-neutral-50 hover:bg-error-500/80',
        outline: 'text-neutral-300',
        premium: 'border-transparent bg-orange-500 text-white hover:bg-orange-600',
        success: 'border-transparent bg-success-50 text-white hover:bg-success-50/80',
        warning: 'border-transparent bg-warning-50 text-neutral-300 hover:bg-warning-50/80',
        // Nutriscore variants
        nutriscore_a: 'border-transparent bg-[#2E7D32] text-white font-bold',
        nutriscore_b: 'border-transparent bg-[#689F38] text-white font-bold',
        nutriscore_c: 'border-transparent bg-[#FBC02D] text-neutral-300 font-bold',
        nutriscore_d: 'border-transparent bg-[#F57C00] text-neutral-300 font-bold',
        nutriscore_e: 'border-transparent bg-[#D32F2F] text-white font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
