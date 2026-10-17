import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'

import { Logo } from '@/components/Logo'
import { NodeNetwork } from '@/components/auth/NodeNetwork'
import { PageTransition } from '@/components/PageTransition'

export function AuthSplitLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <PageTransition>
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col justify-center px-5 py-12 sm:px-10">
          <div className="mx-auto w-full max-w-sm">
            <Link to="/" className="inline-block">
              <Logo />
            </Link>
            <h1 className="mt-8 text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {footer ? (
              <div className="mt-6 text-sm text-muted-foreground">{footer}</div>
            ) : null}
          </div>
        </div>

        <AuthPanel />
      </div>
    </PageTransition>
  )
}

function AuthPanel() {
  const reduced = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 50, damping: 22, mass: 0.6 })
  const sy = useSpring(my, { stiffness: 50, damping: 22, mass: 0.6 })
  const netX = useTransform(sx, (v) => v * 24)
  const netY = useTransform(sy, (v) => v * 24)

  useEffect(() => {
    if (reduced) return
    function onMove(event: PointerEvent) {
      mx.set(event.clientX / window.innerWidth - 0.5)
      my.set(event.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [mx, my, reduced])

  return (
    <div className="relative hidden overflow-hidden lg:block">
      <div className="absolute inset-0 bg-gradient-to-br from-[#1E2A78] via-[#3B5BFF] to-[#8B5CF6]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(700px circle at 70% 20%, rgba(255,255,255,0.35), transparent 60%)',
        }}
      />
      <div
        aria-hidden="true"
        className="dot-grid dot-grid-dark absolute inset-0 opacity-40"
      />
      <Blob
        mx={sx}
        my={sy}
        factor={-40}
        className="absolute -left-24 top-10 size-[30rem] rounded-full blur-3xl"
        color="radial-gradient(circle, rgba(34,211,238,0.35), transparent 68%)"
        duration={20}
      />
      <Blob
        mx={sx}
        my={sy}
        factor={34}
        className="absolute bottom-[-8rem] right-[-6rem] size-[34rem] rounded-full blur-3xl"
        color="radial-gradient(circle, rgba(124,92,255,0.5), transparent 68%)"
        duration={24}
      />
      <div className="noise absolute inset-0 opacity-60" />

      <div className="relative flex h-full flex-col p-12">
        <motion.div style={{ x: netX, y: netY }} className="flex-1">
          <NodeNetwork />
        </motion.div>
        <div className="text-white/90">
          <p className="max-w-sm text-lg font-medium leading-snug">
            Static analysis decides what is true. AI only retrieves and explains.
          </p>
          <p className="mt-3 font-mono text-xs text-white/70">
            Every claim cites real code (file:line).
          </p>
        </div>
      </div>
    </div>
  )
}

function Blob({
  mx,
  my,
  factor,
  className,
  color,
  duration,
}: {
  mx: MotionValue<number>
  my: MotionValue<number>
  factor: number
  className: string
  color: string
  duration: number
}) {
  const x = useTransform(mx, (v) => v * factor)
  const y = useTransform(my, (v) => v * factor)
  return (
    <motion.div aria-hidden="true" style={{ x, y }} className={className}>
      <motion.div
        className="size-full rounded-full"
        style={{ background: color }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}
