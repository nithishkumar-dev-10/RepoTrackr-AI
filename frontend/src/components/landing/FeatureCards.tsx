import { BookOpen, ListChecks, Package } from 'lucide-react'

import { ScrollReveal } from '@/components/ScrollReveal'
import { SpotlightCard } from '@/components/SpotlightCard'

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Reader',
    question: 'Where do I start? How does X work?',
    body: 'An answer with citations, module clusters and a reading order, so you can follow the request path instead of jumping around.',
  },
  {
    icon: ListChecks,
    title: 'Plan Verifier',
    question: 'What is left in my plan?',
    body: 'Every plan item marked done, partial, missing or unknown, each backed by the code that proves it.',
  },
  {
    icon: Package,
    title: 'Context Packer',
    question: 'I want to add X.',
    body: 'A compact markdown context plus a token-efficient prompt, packed to fit a token budget before you paste it anywhere.',
  },
] as const

export function FeatureCards() {
  return (
    <section id="features" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
      <ScrollReveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Three ways to query your repo
        </h2>
        <p className="mt-3 text-muted-foreground">
          One shared index behind all three modes. Static analysis decides what is
          true. AI only retrieves and explains.
        </p>
      </ScrollReveal>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {FEATURES.map((feature, i) => (
          <ScrollReveal key={feature.title} delay={i * 0.1}>
            <SpotlightCard className="h-full p-6 transition-transform duration-300 hover:-translate-y-1">
              <div className="glow-sm grid size-11 place-items-center rounded-xl bg-accent text-brand transition-shadow duration-300">
                <feature.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-1 text-sm font-medium text-brand">
                {feature.question}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </SpotlightCard>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={0.15} className="mt-8 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          Every claim cites real code (file:line).
        </p>
      </ScrollReveal>
    </section>
  )
}
