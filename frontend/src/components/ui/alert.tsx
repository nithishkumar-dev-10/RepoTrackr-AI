import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:size-4 [&>svg~*]:pl-7',
  {
    variants: {
      variant: {
        default: 'border-border bg-surface text-foreground',
        info: 'border-brand/30 bg-accent text-accent-foreground [&>svg]:text-brand',
        destructive:
          'border-destructive/30 bg-destructive/10 text-destructive [&>svg]:text-destructive',
        warning:
          'border-status-partial/30 bg-status-partial/10 text-status-partial [&>svg]:text-status-partial',
        success:
          'border-status-done/30 bg-status-done/10 text-status-done [&>svg]:text-status-done',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

interface AlertProps
  extends ComponentProps<'div'>,
    VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
