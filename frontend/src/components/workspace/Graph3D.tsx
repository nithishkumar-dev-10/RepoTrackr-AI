import { Line, OrbitControls, Html } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Mesh } from 'three'
import * as THREE from 'three'

import type { ClusterCenter, PositionedNode } from '@/lib/graphLayout'
import type { GraphEdge, PlanItemStatus } from '@/types'

const STATUS_COLOR: Record<PlanItemStatus, string> = {
  done: '#22C55E',
  partial: '#F59E0B',
  missing: '#EF4444',
  unknown: '#94A3B8',
}

function CameraRig({ path, enabled }: { path: PositionedNode[]; enabled: boolean }) {
  const { camera } = useThree()
  const index = useRef(0)
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    if (!enabled || path.length === 0) return
    elapsed.current += delta
    if (elapsed.current > 1.8) {
      elapsed.current = 0
      index.current = (index.current + 1) % path.length
    }
    const target = path[index.current]
    camera.position.lerp(
      new THREE.Vector3(target.x, target.y + 5, target.z + 11),
      0.03,
    )
    camera.lookAt(target.x, target.y, target.z)
  })

  return null
}

function Node({
  node,
  selected,
  highlighted,
  dimmed,
  color,
  onSelect,
}: {
  node: PositionedNode
  selected: boolean
  highlighted: boolean
  dimmed: boolean
  color: string
  onSelect?: (id: string) => void
}) {
  const ref = useRef<Mesh>(null)
  const radius = 0.8 + node.centrality * 2.2
  const baseScale = selected ? 1.35 : highlighted ? 1.15 : 1

  useFrame(() => {
    if (!ref.current) return
    ref.current.scale.lerp(new THREE.Vector3(baseScale, baseScale, baseScale), 0.12)
  })

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={ref}
        onPointerDown={(e) => {
          e.stopPropagation()
          onSelect?.(node.id)
        }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={selected || highlighted ? 0.9 : 0.35}
          transparent
          opacity={dimmed ? 0.18 : 1}
          roughness={0.4}
        />
      </mesh>
      {node.isEntry ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius + 0.6, 0.06, 12, 40]} />
          <meshBasicMaterial color="#E4E7EF" transparent opacity={0.6} />
        </mesh>
      ) : null}
    </group>
  )
}

function Scene({
  nodes,
  clusters,
  edges,
  selectedId,
  onSelect,
  highlightIds,
  nodeStatus,
  readingOrder,
}: {
  nodes: PositionedNode[]
  clusters: ClusterCenter[]
  edges: GraphEdge[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  highlightIds?: Set<string>
  nodeStatus?: Map<string, PlanItemStatus>
  readingOrder?: string[]
}) {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
  }, [])

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const dimming = Boolean(highlightIds && highlightIds.size > 0)
  const readingPath = useMemo(() => {
    if (!readingOrder) return []
    return readingOrder
      .map((id) => byId.get(id))
      .filter((n): n is PositionedNode => Boolean(n))
  }, [readingOrder, byId])

  const autoFly = Boolean(readingOrder && readingOrder.length > 0) && !reduced
  const focusIds = useMemo(() => {
    const set = new Set(highlightIds ?? [])
    readingOrder?.forEach((id) => set.add(id))
    return set
  }, [highlightIds, readingOrder])

  return (
    <>
      <CameraRig path={readingPath} enabled={autoFly} />
      <ambientLight intensity={0.7} />
      <pointLight position={[20, 30, 20]} intensity={1.1} />
      <pointLight position={[-25, -10, -20]} intensity={0.5} color="#8B5CF6" />

      {edges.map((edge, i) => {
        const a = byId.get(edge.source)
        const b = byId.get(edge.target)
        if (!a || !b) return null
        const inPath =
          readingOrder?.includes(edge.source) && readingOrder?.includes(edge.target)
        return (
          <Line
            key={`${edge.source}-${edge.target}-${i}`}
            points={[
              [a.x, a.y, a.z],
              [b.x, b.y, b.z],
            ]}
            color={inPath ? '#6D8BFF' : '#475569'}
            lineWidth={inPath ? 1.4 : 0.6}
            transparent
            opacity={dimming && !inPath ? 0.12 : inPath ? 0.8 : 0.32}
          />
        )
      })}

      {nodes.map((node) => {
        const status = nodeStatus?.get(node.id)
        const color = status ? STATUS_COLOR[status] : node.clusterColor
        const highlighted = focusIds.has(node.id)
        return (
          <Node
            key={node.id}
            node={node}
            color={color}
            selected={node.id === selectedId}
            highlighted={highlighted}
            dimmed={dimming && !highlighted}
            onSelect={onSelect}
          />
        )
      })}

      {clusters.map((c) => (
        <Html
          key={c.id}
          position={[c.x, c.y + 6, c.z]}
          center
          distanceFactor={70}
          style={{ pointerEvents: 'none' }}
        >
          <span className="whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/80 backdrop-blur">
            {c.label}
          </span>
        </Html>
      ))}

      {!autoFly ? (
        <OrbitControls
          enablePan={false}
          enableDamping
          autoRotate={!reduced}
          autoRotateSpeed={0.4}
          minDistance={14}
          maxDistance={90}
        />
      ) : null}

      <EffectComposer>
        <Bloom luminanceThreshold={0.25} intensity={0.7} mipmapBlur />
      </EffectComposer>
    </>
  )
}

export default function Graph3D(props: {
  nodes: PositionedNode[]
  clusters: ClusterCenter[]
  edges: GraphEdge[]
  selectedId?: string | null
  onSelect?: (id: string) => void
  highlightIds?: Set<string>
  nodeStatus?: Map<string, PlanItemStatus>
  readingOrder?: string[]
}) {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    function onVisibility() {
      setPaused(document.hidden)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <div
      className="h-full w-full"
      onPointerEnter={() => setPaused(false)}
      onPointerLeave={() => setPaused(true)}
    >
      <Canvas
        frameloop={paused ? 'never' : 'always'}
        dpr={[1, 2]}
        camera={{ position: [0, 32, 52], fov: 50 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0B1020']} />
        <fog attach="fog" args={['#0B1020', 60, 150]} />
        <Scene {...props} />
      </Canvas>
    </div>
  )
}
