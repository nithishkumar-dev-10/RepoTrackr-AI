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
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={0.6}
          />
        )
      })}
      {scene.nodes.map((node) => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={node.r}
          fill={node.hub ? '#7E96FF' : 'rgba(255,255,255,0.75)'}
        />
      ))}
    </svg>
  )
}
