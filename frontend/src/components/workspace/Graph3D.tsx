import { Html, Line, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { Mesh, MeshBasicMaterial } from 'three'
import * as THREE from 'three'
import type { Line2 } from 'three-stdlib'

import type { ClusterHull, PositionedNode } from '@/lib/graphLayout'
import { PLAN_STATUS_META } from '@/lib/planStatus'
import type { GraphEdge, PlanItemStatus } from '@/types'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function reducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

interface CameraTarget {
  center: [number, number, number]
  distance: number
}

function cameraTarget(nodes: PositionedNode[]): CameraTarget {
  if (nodes.length === 0) return { center: [0, 0, 0], distance: 80 }
  const xs = nodes.map((node) => node.x)
  const ys = nodes.map((node) => node.y)
  const zs = nodes.map((node) => node.z)
  const center: [number, number, number] = [
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...ys) + Math.max(...ys)) / 2,
    (Math.min(...zs) + Math.max(...zs)) / 2,
  ]
  const span = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...zs) - Math.min(...zs),
    40,
  )
  return { center, distance: span * 1.2 }
}

/** Re-centers the camera on the current graph whenever reset is requested. */
function CameraReset({
  target,
  resetKey,
  controls,
}: {
  target: CameraTarget
  resetKey: number
  controls: React.RefObject<{ target: THREE.Vector3; update: () => void } | null>
}) {
  const { camera } = useThree()
  useEffect(() => {
    const [x, y, z] = target.center
    camera.position.set(x, y + target.distance * 0.55, z + target.distance)
    camera.lookAt(x, y, z)
    if (controls.current) {
      controls.current.target.set(x, y, z)
      controls.current.update()
    }
  }, [camera, controls, resetKey, target])
  return null
}

/** Expanding ring that marks the selected node (still readable without it). */
function PulseRing({ radius }: { radius: number }) {
  const ref = useRef<Mesh>(null)
  const mat = useRef<MeshBasicMaterial>(null)
  useFrame((state) => {
    if (!ref.current || !mat.current) return
    const p = (state.clock.elapsedTime % 1.8) / 1.8
    const scale = 1 + p * 1.1
    ref.current.scale.set(scale, scale, scale)
    mat.current.opacity = (1 - p) * 0.7
  })
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius + 0.8, 0.1, 8, 40]} />
      <meshBasicMaterial ref={mat} color="#CBD5E1" transparent toneMapped={false} />
    </mesh>
  )
}

function PathPulse({ path }: { path: PositionedNode[] }) {
  const ref = useRef<Mesh>(null)
  const t = useRef(0)
  useFrame((_, delta) => {
    if (!ref.current || path.length < 2) return
    t.current = (t.current + delta * 0.1) % 1
    const segment = t.current * (path.length - 1)
    const index = Math.min(path.length - 2, Math.floor(segment))
    const fraction = segment - index
    const a = path[index]
    const b = path[index + 1]
    ref.current.position.set(
      a.x + (b.x - a.x) * fraction,
      a.y + (b.y - a.y) * fraction,
      a.z + (b.z - a.z) * fraction,
    )
  })
  if (path.length < 2) return null
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.7, 12, 12]} />
      <meshBasicMaterial color="#A5B4FC" toneMapped={false} />
    </mesh>
  )
}

function FlowingBeam({ points }: { points: PositionedNode[] }) {
  const ref = useRef<Line2>(null)
  useFrame(() => {
    const material = ref.current?.material
    if (material && 'dashOffset' in material) material.dashOffset -= 0.02
  })
  if (points.length < 2) return null
  return (
    <Line
      ref={ref}
      points={points.map((node) => [node.x, node.y, node.z])}
      color="#93A5FF"
      lineWidth={1.2}
      transparent
      opacity={0.8}
      dashed
      dashSize={0.9}
      gapSize={0.9}
    />
  )
}

function Node({
  node,
  selected,
  focused,
  dimmed,
  status,
  onSelect,
  onHover,
}: {
  node: PositionedNode
  selected: boolean
  focused: boolean
  dimmed: boolean
  status?: PlanItemStatus
  onSelect?: (id: string) => void
  onHover?: (id: string | null) => void
}) {
  const ref = useRef<Mesh>(null)
  const radius = 1.2 + node.centrality * 1.9
  const scale = selected ? 1.3 : focused ? 1.12 : 1

  useFrame(() => {
    if (!ref.current) return
    ref.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.14)
  })

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        ref={ref}
        onPointerDown={(event) => {
          event.stopPropagation()
          onSelect?.(node.id)
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          onHover?.(node.id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          onHover?.(null)
          document.body.style.cursor = ''
        }}
      >
        <sphereGeometry args={[radius, 18, 18]} />
        <meshStandardMaterial
          color={node.typeColor}
          emissive={node.typeColor}
          emissiveIntensity={selected || focused ? 0.65 : 0.28}
          transparent
          opacity={dimmed ? 0.2 : 1}
          roughness={0.45}
          toneMapped={false}
        />
      </mesh>
      {node.isEntry ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius + 0.6, 0.07, 8, 32]} />
          <meshBasicMaterial color="#E2E8F0" transparent opacity={0.55} />
        </mesh>
      ) : null}
      {status ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius + 0.35, 0.09, 8, 32]} />
          <meshBasicMaterial color={PLAN_STATUS_META[status].color} toneMapped={false} />
        </mesh>
      ) : null}
      {selected ? <PulseRing radius={radius} /> : null}
      {selected || focused ? (
        <Html center distanceFactor={90} style={{ pointerEvents: 'none' }}>
          <span className="whitespace-nowrap rounded-md border border-white/15 bg-slate-950/85 px-2 py-1 text-[11px] font-medium text-slate-100 shadow-lg">
            {node.label}
          </span>
        </Html>
      ) : null}
    </group>
  )
}

function Scene({
  nodes,
  clusters,
  edges,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  focusIds,
  nodeStatus,
  readingOrder,
  resetKey,
}: {
  nodes: PositionedNode[]
  clusters: ClusterHull[]
  edges: GraphEdge[]
  selectedId?: string | null
  hoveredId?: string | null
  onSelect?: (id: string) => void
  onHover?: (id: string | null) => void
  focusIds?: Set<string>
  nodeStatus?: Map<string, PlanItemStatus>
  readingOrder?: string[]
  resetKey: number
}) {
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    () => false,
  )
  const controls = useRef<any>(null)
  const target = useMemo(() => cameraTarget(nodes), [nodes])
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

  const emphasis = hoveredId ?? selectedId
  const neighbors = useMemo(() => {
    const set = new Set<string>()
    if (!emphasis) return set
    for (const edge of edges) {
      if (edge.source === emphasis) set.add(edge.target)
      if (edge.target === emphasis) set.add(edge.source)
    }
    return set
  }, [edges, emphasis])

  const readingPath = useMemo(
    () =>
      readingOrder
        ?.map((id) => byId.get(id))
        .filter((node): node is PositionedNode => Boolean(node)) ?? [],
    [readingOrder, byId],
  )
  const inPath = useMemo(
    () => new Set(readingPath.map((node) => node.id)),
    [readingPath],
  )
  const dimming = Boolean(focusIds?.size) || Boolean(emphasis)
  const isFocused = (id: string) =>
    Boolean(emphasis ? id === emphasis || neighbors.has(id) : focusIds?.has(id))

  return (
    <>
      <CameraReset target={target} resetKey={resetKey} controls={controls} />
      <ambientLight intensity={1.1} />
      <pointLight position={[20, 30, 20]} intensity={0.8} />

      {edges.map((edge, index) => {
        const a = byId.get(edge.source)
        const b = byId.get(edge.target)
        if (!a || !b) return null
        const active = emphasis
          ? edge.source === emphasis || edge.target === emphasis
          : Boolean(
              focusIds && focusIds.size > 0 && focusIds.has(edge.source) && focusIds.has(edge.target),
            )
        const route = inPath.has(edge.source) && inPath.has(edge.target)
        if (route && !emphasis && !focusIds?.size) {
          return <FlowingBeam key={`${edge.source}-${edge.target}-${index}`} points={[a, b]} />
        }
        return (
          <Line
            key={`${edge.source}-${edge.target}-${index}`}
            points={[
              [a.x, a.y, a.z],
              [b.x, b.y, b.z],
            ]}
            color={active ? '#93A5FF' : '#64748B'}
            lineWidth={active ? 1.1 : 0.5}
            transparent
            opacity={dimming && !active ? 0.08 : active ? 0.9 : route ? 0.5 : 0.28}
          />
        )
      })}

      {nodes.map((node) => {
        const focused = isFocused(node.id)
        return (
          <Node
            key={node.id}
            node={node}
            selected={node.id === selectedId}
            focused={focused}
            dimmed={dimming && !focused}
            status={nodeStatus?.get(node.id)}
            onSelect={onSelect}
            onHover={onHover}
          />
        )
      })}

      {!reduced && readingPath.length > 1 ? <PathPulse path={readingPath} /> : null}

      {clusters.map((cluster) => (
        <Html
          key={cluster.id}
          position={[cluster.x, cluster.y + 9, cluster.z]}
          center
          distanceFactor={110}
          style={{ pointerEvents: 'none' }}
        >
          <span className="whitespace-nowrap rounded-full border border-white/10 bg-slate-950/70 px-2 py-0.5 text-[10px] font-medium text-slate-300">
            {cluster.label}
          </span>
        </Html>
      ))}

      <OrbitControls
        ref={controls}
        makeDefault
        target={target.center}
        enableDamping={!reduced}
        enablePan
        minDistance={Math.max(12, target.distance * 0.35)}
        maxDistance={target.distance * 3}
      />
    </>
  )
}

export default function Graph3D(props: {
  nodes: PositionedNode[]
  clusters: ClusterHull[]
  edges: GraphEdge[]
  selectedId?: string | null
  hoveredId?: string | null
  onSelect?: (id: string) => void
  onHover?: (id: string | null) => void
  focusIds?: Set<string>
  nodeStatus?: Map<string, PlanItemStatus>
  readingOrder?: string[]
  resetKey?: number
}) {
  const [paused, setPaused] = useState(false)
  const target = useMemo(() => cameraTarget(props.nodes), [props.nodes])
  const resetKey = props.resetKey ?? 0

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
        camera={{
          position: [
            target.center[0],
            target.center[1] + target.distance * 0.55,
            target.center[2] + target.distance,
          ],
          fov: 50,
        }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0B1020']} />
        <fog attach="fog" args={['#0B1020', 120, 320]} />
        <Scene {...props} resetKey={resetKey} />
      </Canvas>
    </div>
  )
}
