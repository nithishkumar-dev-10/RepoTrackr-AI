import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'

interface MiniNode {
  id: string
  x: number
  y: number
  r: number
  cluster: number
  entry?: boolean
}

const CLUSTER_COLORS = ['#3B5BFF', '#16A34A', '#F59E0B', '#8B5CF6']

const NODES: MiniNode[] = [
  { id: 'main', x: 40, y: 60, r: 9, cluster: 0, entry: true },
  { id: 'config', x: 96, y: 30, r: 6, cluster: 0 },
  { id: 'routes', x: 40, y: 128, r: 7, cluster: 1 },
  { id: 'deps', x: 104, y: 96, r: 6, cluster: 1 },
  { id: 'auth', x: 168, y: 132, r: 8, cluster: 2 },
  { id: 'tokens', x: 224, y: 96, r: 6, cluster: 2 },
  { id: 'models', x: 96, y: 184, r: 8, cluster: 3 },
  { id: 'db', x: 168, y: 208, r: 6, cluster: 3 },
  { id: 'repo', x: 224, y: 176, r: 6, cluster: 3 },
  { id: 'indexer', x: 168, y: 44, r: 7, cluster: 1 },
]

const EDGES: [string, string][] = [
  ['main', 'config'],
  ['main', 'routes'],
  ['main', 'indexer'],
  ['routes', 'deps'],
  ['routes', 'models'],
  ['deps', 'auth'],
  ['auth', 'tokens'],
  ['models', 'db'],
  ['models', 'repo'],
  ['db', 'repo'],
  ['indexer', 'deps'],
  ['config', 'indexer'],
]

const byId = new Map(NODES.map((n) => [n.id, n]))

/** Reading-order path used for the travelling packet. */
const PATH = ['main', 'routes', 'deps', 'auth', 'tokens']

export function MiniGraph({ className }: { className?: string }) {
  const pathPoints = PATH.map((id) => byId.get(id)!).filter(Boolean)

  return (
    <svg
      viewBox="0 0 264 248"
      className={cn('h-full w-full', className)}
      role="img"
      aria-label="Animated module graph"
    >
      <defs>
        <radialGradient id="mini-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3B5BFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3B5BFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      {EDGES.map(([a, b], i) => {
        const from = byId.get(a)!
        const to = byId.get(b)!
        return (
          <motion.line
            key={`${a}-${b}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#C9D0E4"
            strokeWidth={1.2}
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 + i * 0.05 }}
          />
        )
      })}

      {NODES.map((node, i) => (
        <motion.g
          key={node.id}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.05, ease: 'easeOut' }}
          style={{ transformOrigin: `${node.x}px ${node.y}px` }}
        >
          {node.entry ? (
            <motion.circle
              cx={node.x}
              cy={node.y}
              r={node.r + 6}
              fill="none"
              stroke={CLUSTER_COLORS[node.cluster]}
              strokeWidth={1.4}
              strokeDasharray="3 4"
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              style={{ transformOrigin: `${node.x}px ${node.y}px` }}
            />
          ) : null}
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r + 6}
            fill="url(#mini-glow)"
          />
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill={CLUSTER_COLORS[node.cluster]}
            opacity={0.9}
          />
          <circle cx={node.x} cy={node.y} r={node.r * 0.42} fill="#fff" />
        </motion.g>
      ))}

      <motion.circle
        r={3.4}
        fill="#0B1020"
        animate={{
          cx: pathPoints.map((p) => p.x),
          cy: pathPoints.map((p) => p.y),
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 5.2,
          repeat: Infinity,
          repeatDelay: 1.2,
          ease: 'easeInOut',
          times: [0, 0.08, 0.92, 1],
        }}
      />
    </svg>
  )
}
