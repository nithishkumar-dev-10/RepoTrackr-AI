import { cn } from '@/lib/utils'

/** A small connected-node glyph: three nodes joined by edges, with a glow. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative grid size-8 shrink-0 place-items-center rounded-lg bg-canvas text-white shadow-sm glow-sm',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden="true">
        <defs>
          <filter id="logo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          filter="url(#logo-glow)"
        >
          <path d="M8 7.2 15.7 8.6M7.4 8.2l3.4 7.6M16.8 9.1l-3.5 6.7" opacity="0.85" />
          <circle cx="6" cy="6" r="2.4" />
          <circle cx="18" cy="7" r="2.4" />
          <circle cx="12" cy="18" r="2.4" />
        </g>
      </svg>
    </span>
  )
}

export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string
  withWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      {withWordmark ? (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          RepoTrackr<span className="text-brand"> AI</span>
        </span>
      ) : null}
    </span>
  )
}
