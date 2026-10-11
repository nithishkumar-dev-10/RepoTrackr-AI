import { cn } from '@/lib/utils'

export function Logo({
  className,
  withWordmark = true,
}: {
  className?: string
  withWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-canvas text-canvas shadow-sm">
        <svg viewBox="0 0 24 24" className="size-4.5" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="6" cy="6" r="2.4" />
            <circle cx="18" cy="7" r="2.4" />
            <circle cx="12" cy="18" r="2.4" />
            <path d="M8 7.2 15.7 8.6M7.4 8.2l3.4 7.6M16.8 9.1l-3.5 6.7" />
          </g>
        </svg>
      </span>
      {withWordmark ? (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          RepoTrackr<span className="text-brand"> AI</span>
        </span>
      ) : null}
    </span>
  )
}
