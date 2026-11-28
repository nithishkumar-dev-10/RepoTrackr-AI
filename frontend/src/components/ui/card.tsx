import type { ComponentProps } from 'react'

import type { Accent } from '@/lib/designTokens'
import { cn } from '@/lib/utils'

/** Static Tailwind classes so the accent utilities survive production purging. */
const BAR: Record<Accent, string> = {
  brand: 'before:bg-brand',
  teal: 'before:bg-teal',
  violet: 'before:bg-violet',
  amber: 'before:bg-amber',
  rose: 'before:bg-rose',
  emerald: 'before:bg-emerald',
}

const ICON: Record<Accent, string> = {
  brand: 'bg-brand-tint text-brand',
  teal: 'bg-teal-tint text-teal',
  violet: 'bg-violet-tint text-violet',
  amber: 'bg-amber-tint text-amber',
  rose: 'bg-rose-tint text-rose',
  emerald: 'bg-emerald-tint text-emerald',
}

type CardProps = ComponentProps<'div'> & { accent?: Accent }

function Card({ className, accent, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-accent={accent}
      className={cn(
        'relative overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-card transition-shadow duration-200',
        accent &&
          'before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:content-[""]',
        accent && BAR[accent],
        className,
      )}
      {...props}
    />
  )
}

/** Tinted, AA-contrast icon well used inside accented cards. */
function AccentIcon({
  accent,
  className,
  children,
  ...props
}: ComponentProps<'span'> & { accent: Accent }) {
  return (
    <span
      data-slot="accent-icon"
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-xl',
        ICON[accent],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1.5 p-6', className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('text-lg font-semibold leading-tight', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('p-6 pt-0', className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
}

export {
  Card,
  AccentIcon,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
}
export type { CardProps }
