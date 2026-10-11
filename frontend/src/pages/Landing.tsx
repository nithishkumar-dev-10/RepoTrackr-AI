import { motion } from 'framer-motion'
import { ArrowRight, Terminal } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Counter } from '@/components/Counter'
import { FeatureCards } from '@/components/landing/FeatureCards'
import { InteractiveDemo } from '@/components/landing/InteractiveDemo'
import { PipelineSection } from '@/components/landing/PipelineSection'
import { Logo } from '@/components/Logo'
import { MagneticButton } from '@/components/MagneticButton'
import { PageTransition } from '@/components/PageTransition'
import { ScrollReveal } from '@/components/ScrollReveal'
import { Button } from '@/components/ui/button'

const STATS = [
  { value: 3, suffix: '', label: 'query modes' },
  { value: 1, suffix: '', label: 'shared index' },
  { value: 100, suffix: '%', label: 'cited claims' },
] as const

export default function Landing() {
  return (
    <PageTransition>
      <div className="relative min-h-svh overflow-hidden bg-background">
        <GradientBackdrop />

        <header className="relative z-20">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Logo />
            <nav className="flex items-center gap-1 sm:gap-2">
              <a
                href="#features"
                className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
              >
                Features
              </a>
              <a
                href="#how"
                className="hidden rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
              >
                How it works
              </a>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild variant="brand" size="sm">
                <Link to="/signup">Get started</Link>
              </Button>
            </nav>
          </div>
        </header>

        <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur"
            >
              <span className="size-1.5 rounded-full bg-status-done" />
              Reader, Plan Verifier and Context Packer in one tool
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-5 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-6xl"
            >
              Understand any Python repo
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground"
            >
              Ask where to start, what is left in your plan, or pack the context
              for your next change. Every claim cites real code (file:line).
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              <MagneticButton>
                <Button asChild variant="brand" size="lg">
                  <Link to="/signup">
                    Get started
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </MagneticButton>
              <Button asChild variant="outline" size="lg">
                <Link to="/login">Log in</Link>
              </Button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-4 font-mono text-xs text-muted-foreground"
            >
              Static analysis decides what is true. AI only retrieves and explains.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-4"
          >
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-border bg-surface/70 p-4 text-center backdrop-blur"
              >
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  <Counter to={stat.value} suffix={stat.suffix} />
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
              <div className="relative overflow-hidden rounded-3xl border border-border bg-canvas px-6 py-14">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-60"
                  style={{
                    background:
                      'radial-gradient(600px circle at 50% -10%, rgba(59,91,255,0.35), transparent 60%)',
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
                    <MagneticButton>
                      <Button asChild variant="brand" size="lg">
                        <Link to="/signup">
                          Get started free
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </MagneticButton>
                    <Button
                      asChild
                      size="lg"
                      className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                    >
                      <Link to="/developer">
                        <Terminal className="size-4" />
                        View the API
                      </Link>
                    </Button>
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

function GradientBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0">
      <motion.div
        className="absolute -left-24 -top-24 size-[36rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(59,91,255,0.16), transparent 65%)',
        }}
        animate={{ x: [0, 40, 0], y: [0, 24, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-10rem] top-40 size-[32rem] rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(139,92,246,0.14), transparent 65%)',
        }}
        animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
