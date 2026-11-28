import { useMemo } from 'react'

import { hues, ACCENTS } from '@/lib/designTokens'

/** Deterministic tiny graph thumbnail seeded by repo id. Decorative only. */
export function MiniGraphThumb({
  seed,
  className,
}: {
  seed: number
  className?: string
}) {
  const scene = useMemo(() => {
    // Pure, index-seeded values: no render-scope variable is reassigned, so
    // the decorative thumbnail stays deterministic and Fast Refresh-safe.
    const rand = (index: number) =>
      ((seed * 9301 + (index + 1) * 49297) % 233280) / 233280
    const count = 9 + Math.floor(rand(0) * 4)
    const nodes = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 12 + rand(1 + i * 3) * 76,
      y: 12 + rand(2 + i * 3) * 52,
      r: 2.4 + rand(3 + i * 3) * 2.6,
      hub: i === 0,
      color: hues[ACCENTS[i % ACCENTS.length]].graph,
    }))
    const edges: [number, number][] = []
    for (let i = 1; i < count; i += 1) {
      edges.push([0, i])
    }
    for (let i = 0; i < count; i += 1) {
      if (rand(100 + i) > 0.65 && i + 1 < count) edges.push([i, i + 1])
    }
    return { nodes, edges }
  }, [seed])

  return (
    <svg
      viewBox="0 0 100 76"
      className={className}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`thumb-bg-${seed}`} cx="50%" cy="42%" r="70%">
          <stop offset="0%" stopColor={hues.brand.graph} stopOpacity="0.2" />
          <stop offset="100%" stopColor={hues.brand.graph} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="100" height="76" fill="#0B1020" />
      <rect width="100" height="76" fill={`url(#thumb-bg-${seed})`} />

      {scene.edges.map(([a, b], i) => {
        const from = scene.nodes[a]
        const to = scene.nodes[b]
        return (
          <line
            key={i}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="rgba(148,163,184,0.55)"
            strokeWidth={0.5}
          />
        )
      })}
      {scene.nodes.map((node) => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r + (node.hub ? 1.4 : 0.6)}
            fill={node.color}
            fillOpacity={node.hub ? 0.22 : 0.14}
          />
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill={node.color}
            stroke={node.hub ? '#FFFFFF' : 'none'}
            strokeOpacity={node.hub ? 0.75 : 0}
            strokeWidth={0.5}
          />
        </g>
      ))}
    </svg>
  )
}
