import { Line, OrbitControls, Html } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Mesh, MeshBasicMaterial } from 'three'
import * as THREE from 'three'
import type { Line2 } from 'three-stdlib'

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

/** Expanding glow ring that marks the selected node. */
function PulseRing({ radius }: { radius: number }) {
  const ref = useRef<Mesh>(null)
  const mat = useRef<MeshBasicMaterial>(null)
  useFrame((state) => {
    if (!ref.current || !mat.current) return
    const p = (state.clock.elapsedTime % 1.6) / 1.6
    const s = 1 + p * 1.5
    ref.current.scale.set(s, s, s)
    mat.current.opacity = (1 - p) * 0.85
  })
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius + 0.9, 0.09, 8, 48]} />
      <meshBasicMaterial
        ref={mat}
        color="#BFD0FF"
        transparent
        toneMapped={false}
      />
    </mesh>
  )
}

/** A light pulse that travels the reading path once the path is active. */
function PathPulse({ path }: { path: PositionedNode[] }) {
  const ref = useRef<Mesh>(null)
  const t = useRef(0)
  useFrame((_, delta) => {
    if (!ref.current || path.length < 2) return
    t.current = (t.current + delta * 0.14) % 1
    const seg = t.current * (path.length - 1)
    const i = Math.min(path.length - 2, Math.floor(seg))
    const f = seg - i
    const a = path[i]
    const b = path[i + 1]
    ref.current.position.set(
      a.x + (b.x - a.x) * f,
      a.y + (b.y - a.y) * f,
      a.z + (b.z - a.z) * f,
    )
  })
  if (path.length < 2) return null
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.6, 16, 16]} />
      <meshBasicMaterial color="#CFDBFF" toneMapped={false} />
    </mesh>
  )
}

/** Animated dashed beam for the reading-path edges (flowing evidence). */
function FlowingBeam({ points }: { points: PositionedNode[] }) {
  const ref = useRef<Line2>(null)
  useFrame(() => {
    const material = ref.current?.material
    if (material && 'dashOffset' in material) {
      material.dashOffset -= 0.02
    }
  })
  if (points.length < 2) return null
  return (
    <Line
      ref={ref}
      points={points.map((n) => [n.x, n.y, n.z])}
      color="#6D8BFF"
      lineWidth={1.4}
      transparent
      opacity={0.85}
      dashed
      dashSize={0.8}
      gapSize={0.75}
    />
  )
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
          emissiveIntensity={selected || highlighted ? 1.3 : 0.55}
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
      {selected ? <PulseRing radius={radius} /> : null}
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
        if (inPath) {
          return (
            <FlowingBeam
              key={`${edge.source}-${edge.target}-${i}`}
              points={[a, b]}
            />
          )
        }
        return (
          <Line
            key={`${edge.source}-${edge.target}-${i}`}
            points={[
              [a.x, a.y, a.z],
              [b.x, b.y, b.z],
            ]}
            color="#475569"
            lineWidth={0.6}
            transparent
            opacity={dimming ? 0.12 : 0.32}
          />
        )
      })}

      {clusters.map((c) => (
        <mesh key={`halo-${c.id}`} position={[c.x, c.y, c.z]}>
          <sphereGeometry args={[9, 16, 16]} />
          <meshBasicMaterial
            color={c.color}
            transparent
            opacity={0.055}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {autoFly ? <PathPulse path={readingPath} /> : null}

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
        <Bloom
          luminanceThreshold={0.32}
          luminanceSmoothing={0.22}
          intensity={1.15}
          radius={0.72}
          mipmapBlur
        />
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
