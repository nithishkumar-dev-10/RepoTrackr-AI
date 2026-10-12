import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import { ArrowRight, Terminal } from 'lucide-react'
import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import { Counter } from '@/components/Counter'
import { FeatureCards } from '@/components/landing/FeatureCards'
import { InteractiveDemo } from '@/components/landing/InteractiveDemo'
import { PipelineSection } from '@/components/landing/PipelineSection'
import { GlowButton } from '@/components/GlowButton'
import { Logo } from '@/components/Logo'
import { PageTransition } from '@/components/PageTransition'
import { ScrollReveal } from '@/components/ScrollReveal'

const STATS = [
  { kind: 'count', value: 3, label: 'query modes' },
  { kind: 'count', value: 1, label: 'shared index' },
  { kind: 'text', value: 'file:line', label: 'on every claim' },
] as const

const HEADLINE: { text: string; gradient?: boolean }[] = [
  { text: 'Understand' },
  { text: 'any' },
  { text: 'Python', gradient: true },
  { text: 'repo', gradient: true },
]

export default function Landing() {
  return (
    <PageTransition>
      <div className="relative min-h-svh overflow-hidden bg-background">
        <AuroraBackdrop />

        <header className="relative z-20">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Logo />
            <nav className="flex items-center gap-1 sm:gap-2">
              <a
                href="#features"
                className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground sm:inline-block"
              >
                Features
              </a>
              <a
                href="#how"
                className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground sm:inline-block"
              >
                How it works
              </a>
              <Link
                to="/login"
                className="glass inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-foreground transition-shadow duration-200 hover:glow-sm"
              >
                Log in
              </Link>
              <GlowButton asChild variant="brand" size="sm" magnetic={false}>
                <Link to="/signup">Get started</Link>
              </GlowButton>
            </nav>
          </div>
        </header>

        <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs text-muted-foreground"
            >
              <span
                className="pulse-dot size-1.5 rounded-full bg-status-done"
                style={{ '--glow-soft': 'rgba(22,163,74,0.5)' } as CSSProperties}
              />
              Reader, Plan Verifier and Context Packer in one tool
            </motion.span>

            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              {HEADLINE.map((word, i) => (
                <motion.span
                  key={word.text}
                  initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.55,
                    delay: 0.08 + i * 0.09,
                    ease: 'easeOut',
                  }}
                  className={
                    'mr-[0.28em] inline-block' +
                    (word.gradient
                      ? ' glow-text bg-gradient-to-r from-[#3B5BFF] via-[#7C5CFF] to-[#22D3EE] bg-clip-text text-transparent'
                      : '')
                  }
                >
                  {word.text}
                </motion.span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.42 }}
              className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground"
            >
              Ask where to start, what is left in your plan, or pack the context
              for your next change. Every claim cites real code (file:line).
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <GlowButton
                asChild
                variant="brand"
                size="lg"
                className="gradient-border gradient-border-on"
              >
                <Link to="/signup">
                  Get started
                  <ArrowRight className="size-4" />
                </Link>
              </GlowButton>
              <Link
                to="/login"
                className="glass inline-flex h-11 items-center rounded-md px-6 text-sm font-medium text-foreground transition-shadow duration-200 hover:glow-sm"
              >
                Log in
              </Link>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.58 }}
              className="mt-4 font-mono text-xs text-muted-foreground"
            >
              Static analysis decides what is true. AI only retrieves and explains.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.62 }}
            className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-4"
          >
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="glass gradient-border rounded-2xl p-4 text-center transition-shadow duration-200 hover:glow-md"
              >
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {stat.kind === 'count' ? (
                    <Counter to={stat.value} />
                  ) : (
                    <span className="font-mono text-xl">{stat.value}</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </section>

        <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-8 sm:px-6">
          <ScrollReveal>
            <InteractiveDemo />
          </ScrollReveal>
        </section>

        <div className="relative z-10">
          <FeatureCards />
          <PipelineSection />

          <section className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6">
            <ScrollReveal>
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-x-10 -bottom-10 top-1/3 -z-10 rounded-[3rem] blur-2xl"
                  style={{
                    background:
                      'radial-gradient(60% 70% at 50% 100%, rgba(59,91,255,0.35), transparent 70%)',
                  }}
                />
                <div className="gradient-border gradient-border-on noise relative overflow-hidden rounded-3xl border border-white/10 bg-canvas px-6 py-14 glow-lg">
                  <div
                    aria-hidden="true"
                    className="dot-grid dot-grid-dark pointer-events-none absolute inset-0 opacity-50"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full blur-3xl"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(59,91,255,0.5), transparent 65%)',
                    }}
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-16 bottom-[-6rem] size-72 rounded-full blur-3xl"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(124,92,255,0.45), transparent 65%)',
                    }}
                  />
                  <div className="relative">
                    <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                      Point it at a repo. Get answers you can check.
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-white/70">
                      Track a GitHub repository and start reading in minutes. No
                      black boxes — every answer links to the code behind it.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                      <GlowButton
                        asChild
                        variant="brand"
                        size="lg"
                        className="gradient-border gradient-border-on"
                      >
                        <Link to="/signup">
                          Get started free
                          <ArrowRight className="size-4" />
                        </Link>
                      </GlowButton>
                      <Link
                        to="/developer"
                        className="inline-flex h-11 items-center gap-2 rounded-md border border-white/20 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur transition-colors duration-200 hover:bg-white/20"
                      >
                        <Terminal className="size-4" />
                        View the API
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </section>

          <footer className="border-t border-border">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 sm:flex-row sm:px-6">
              <Logo />
              <p className="font-mono text-xs text-muted-foreground">
                Every claim cites real code (file:line).
              </p>
            </div>
          </footer>
        </div>
      </div>
    </PageTransition>
  )
}

function AuroraBlob({
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
    <motion.div style={{ x, y }} className={className}>
      <motion.div
        className="size-full rounded-full blur-3xl"
        style={{ background: color }}
        animate={{ scale: [1, 1.14, 1], opacity: [0.75, 1, 0.75] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  )
}

function AuroraBackdrop() {
  const reduced = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 45, damping: 22, mass: 0.6 })
  const sy = useSpring(my, { stiffness: 45, damping: 22, mass: 0.6 })

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
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="dot-grid absolute inset-0 opacity-70" />
      <AuroraBlob
        mx={sx}
        my={sy}
        factor={26}
        className="absolute -left-28 -top-28 size-[38rem]"
        color="radial-gradient(circle, rgba(59,91,255,0.20), transparent 66%)"
        duration={18}
      />
      <AuroraBlob
        mx={sx}
        my={sy}
        factor={-34}
        className="absolute right-[-12rem] top-28 size-[34rem]"
        color="radial-gradient(circle, rgba(124,92,255,0.18), transparent 66%)"
        duration={22}
      />
      <AuroraBlob
        mx={sx}
        my={sy}
        factor={20}
        className="absolute left-1/3 top-[38rem] size-[30rem]"
        color="radial-gradient(circle, rgba(34,211,238,0.12), transparent 66%)"
        duration={26}
      />
      <div className="noise absolute inset-0" />
    </div>
  )
}
