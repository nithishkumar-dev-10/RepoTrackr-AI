import { motion, useScroll, useTransform } from 'framer-motion'
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
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <section
      id="how"
      className="border-y border-border bg-surface/60 py-20"
    >
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
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-border md:block">
            <motion.div
              style={{ scaleX, transformOrigin: 'left' }}
              className="h-px bg-brand"
            />
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
                <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full border border-border bg-surface text-brand shadow-sm">
                  <stage.icon className="size-5" />
                  <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-canvas font-mono text-[10px] text-canvas">
                    {i + 1}
                  </span>
                </span>
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
