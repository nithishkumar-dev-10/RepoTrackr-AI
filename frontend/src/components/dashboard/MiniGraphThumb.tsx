import { useMemo } from 'react'

/** Deterministic tiny graph thumbnail seeded by repo id. Decorative only. */
export function MiniGraphThumb({
  seed,
  className,
}: {
  seed: number
  className?: string
}) {
  const scene = useMemo(() => {
    let state = seed * 9301 + 49297
    const rand = () => {
      state = (state * 9301 + 49297) % 233280
      return state / 233280
    }
    const count = 9 + Math.floor(rand() * 4)
    const nodes = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 12 + rand() * 76,
      y: 12 + rand() * 52,
      r: 2 + rand() * 3,
      hub: i === 0,
    }))
    const edges: [number, number][] = []
    for (let i = 1; i < count; i += 1) {
      edges.push([0, i])
    }
    for (let i = 0; i < count; i += 1) {
      if (rand() > 0.65 && i + 1 < count) edges.push([i, i + 1])
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
        <filter id={`thumb-halo-${seed}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <radialGradient id={`thumb-bg-${seed}`} cx="50%" cy="42%" r="70%">
          <stop offset="0%" stopColor="#3B5BFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3B5BFF" stopOpacity="0" />
        </radialGradient>
      </defs>

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
            stroke="rgba(160,180,255,0.35)"
            strokeWidth={0.6}
          />
        )
      })}
      {scene.nodes.map((node) => {
        const color = node.hub ? '#7E96FF' : 'rgba(255,255,255,0.8)'
        return (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r + 1.5}
              fill={color}
              opacity={0.5}
              filter={`url(#thumb-halo-${seed})`}
            />
            <circle cx={node.x} cy={node.y} r={node.r} fill={color} />
          </g>
        )
      })}
    </svg>
  )
}
