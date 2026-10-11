import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        brand: 'border-transparent bg-accent text-accent-foreground',
        outline: 'border-border text-muted-foreground',
        done: 'border-transparent bg-status-done/15 text-status-done',
        partial: 'border-transparent bg-status-partial/15 text-status-partial',
        missing: 'border-transparent bg-status-missing/15 text-status-missing',
        unknown: 'border-transparent bg-status-unknown/20 text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

interface BadgeProps
  extends ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
export type { BadgeProps }
