import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Boxes, FileCode2, GitBranch, Network, Sparkles } from 'lucide-react'
import { useRef } from 'react'

const STAGES = [
  { icon: GitBranch, label: 'Clone', note: 'Fetch the repo into a local cache' },
  { icon: FileCode2, label: 'Parse', note: 'AST per file, real symbols' },
  { icon: Network, label: 'Graph', note: 'Imports and calls as edges' },
  { icon: Boxes, label: 'Index', note: 'One index powers all modes' },
  { icon: Sparkles, label: 'Answer', note: 'Retrieve, reason, cite' },
] as const

export function PipelineSection() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.5'],
  })
  const progress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.4,
  })
  const scaleX = useTransform(progress, [0, 1], [0, 1])
  const pulseX = useTransform(progress, [0, 1], ['0%', '100%'])

  return (
    <section id="how" className="border-y border-border bg-surface/60 py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Deterministic analysis builds the index first. Answers are retrieved
            from that index, never invented.
          </p>
        </div>

        <div ref={ref} className="relative mt-14">
          <div className="absolute left-0 right-0 top-6 hidden h-1 rounded-full bg-border/70 md:block">
            <motion.div
              style={{ scaleX, transformOrigin: 'left' }}
              className="h-1 rounded-full"
              // Glowing gradient fill for the completed segment.
            >
              <span
                className="block h-full w-full rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, #3B5BFF, #7C5CFF 55%, #22D3EE)',
                  boxShadow: '0 0 14px 1px rgba(59,91,255,0.5)',
                }}
              />
            </motion.div>
            <motion.div
              aria-hidden="true"
              style={{ x: pulseX }}
              className="pointer-events-none absolute inset-y-0 left-0 w-full"
            >
              <span
                className="absolute left-0 top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-white"
                style={{ boxShadow: '0 0 12px 3px rgba(124,147,255,0.95)' }}
              />
            </motion.div>
          </div>

          <ol className="grid gap-8 md:grid-cols-5 md:gap-4">
            {STAGES.map((stage, i) => (
              <motion.li
                key={stage.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.45, delay: i * 0.12 }}
                className="relative flex gap-4 md:flex-col md:items-center md:text-center"
              >
                <motion.span
                  whileInView={{ scale: [0.9, 1.08, 1] }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.5, delay: i * 0.12 + 0.1 }}
                  className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full border border-brand/30 bg-surface text-brand shadow-sm glow-sm"
                >
                  <stage.icon className="size-5" />
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-canvas font-mono text-[10px] font-semibold text-white">
                    {i + 1}
                  </span>
                </motion.span>
                <div className="md:mt-3">
                  <p className="font-medium text-foreground">{stage.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stage.note}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
