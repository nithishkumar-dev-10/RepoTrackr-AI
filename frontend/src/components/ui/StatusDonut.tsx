import { cn } from '@/lib/utils'

export interface DonutSegment {
  label: string
  color: string
  value: number
}

/**
 * Small status donut built from the same token colors as the badges and graph
 * rings. The center stays on a solid surface so the count is always readable.
 */
export function StatusDonut({
  segments,
  total,
  centerLabel,
  className,
}: {
  segments: DonutSegment[]
  total: number
  centerLabel: React.ReactNode
  className?: string
}) {
  const denominator = Math.max(1, total)
  const stops = segments.map((segment, index) => {
    const before = segments
      .slice(0, index)
      .reduce((sum, item) => sum + item.value, 0)
    const through = before + segment.value
    return `${segment.color} ${(before / denominator) * 100}% ${(through / denominator) * 100}%`
  })
  const gradient = `conic-gradient(from -90deg, ${stops.join(', ')})`
  const summary = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => `${segment.value} ${segment.label.toLowerCase()}`)
    .join(', ')

  return (
    <div
      role="img"
      aria-label={`Status: ${summary || 'no items'}`}
      className={cn(
        'relative grid size-20 shrink-0 place-items-center rounded-full ring-1 ring-border',
        className,
      )}
      style={{ background: gradient }}
    >
      <div className="grid size-12 place-items-center rounded-full bg-surface shadow-inner">
        <span className="text-lg font-semibold text-foreground">{centerLabel}</span>
      </div>
    </div>
  )
}
