import { motion } from 'framer-motion'

const NODES = [
  { x: 60, y: 80 },
  { x: 150, y: 40 },
  { x: 250, y: 90 },
  { x: 330, y: 50 },
  { x: 360, y: 170 },
  { x: 280, y: 220 },
  { x: 170, y: 250 },
  { x: 80, y: 210 },
  { x: 40, y: 150 },
  { x: 210, y: 140 },
]

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [8, 0],
  [0, 9],
  [9, 2],
  [9, 6],
  [1, 9],
]

/** Soft animated node network used on the auth gradient panel. Pure SVG. */
export function NodeNetwork() {
  return (
    <svg
      viewBox="0 0 400 300"
      className="h-full w-full"
      role="img"
      aria-label="Animated network illustration"
    >
      {EDGES.map(([a, b], i) => (
        <motion.line
          key={`${a}-${b}`}
          x1={NODES[a].x}
          y1={NODES[a].y}
          x2={NODES[b].x}
          y2={NODES[b].y}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={1}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3 + i * 0.08 }}
        />
      ))}

      {NODES.map((node, i) => (
        <motion.g
          key={`${node.x}-${node.y}`}
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 5 + (i % 4),
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.3,
          }}
        >
          <circle cx={node.x} cy={node.y} r={10} fill="rgba(255,255,255,0.14)" />
          <circle
            cx={node.x}
            cy={node.y}
            r={i % 3 === 0 ? 5 : 3.5}
            fill="#fff"
            opacity={0.9}
          />
        </motion.g>
      ))}

      <motion.circle
        r={3.5}
        fill="#fff"
        animate={{
          cx: [NODES[0].x, NODES[1].x, NODES[2].x, NODES[9].x, NODES[6].x],
          cy: [NODES[0].y, NODES[1].y, NODES[2].y, NODES[9].y, NODES[6].y],
        }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  )
}
