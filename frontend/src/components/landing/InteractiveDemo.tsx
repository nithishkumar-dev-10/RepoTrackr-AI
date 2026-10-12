import { AnimatePresence, motion } from 'framer-motion'
import { Search, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { demoResponseForQuery } from '@/api/galaxy'
import { CitationChip } from '@/components/CitationChip'
import { MiniGraph } from '@/components/landing/MiniGraph'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const DEMO_QUERIES = [
  'Where do I start reading this repo?',
  'How does authentication work?',
  'What is left in my plan?',
  'I want to add GitHub OAuth.',
] as const

const INTENT_LABEL: Record<string, string> = {
  reader: 'Reader',
  plan: 'Plan Verifier',
  context_pack: 'Context Packer',
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Renders `inline code` as a chip and **bold** as a strong span. */
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const regex = /(`[^`]*`|\*\*[^*]+\*\*)/g
  let last = 0
  let key = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(text))) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const token = match[0]
    if (token.startsWith('`')) {
      nodes.push(
        <code
          key={key++}
          className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[0.8em] text-brand"
        >
          {token.slice(1, -1)}
        </code>,
      )
    } else {
      nodes.push(
        <strong key={key++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      )
    }
    last = match.index + token.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function InteractiveDemo() {
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [shownWords, setShownWords] = useState(0)
  const [streaming, setStreaming] = useState(false)

  const query = DEMO_QUERIES[index]
  const response = useMemo(() => demoResponseForQuery(query), [query])
  const words = useMemo(() => response.answer.split(/(\s+)/), [response])

  useEffect(() => {
    let cancelled = false
    async function cycle() {
      setTyped('')
      setShownWords(0)
      setStreaming(false)

      for (let i = 1; i <= query.length; i += 1) {
        if (cancelled) return
        setTyped(query.slice(0, i))
        await sleep(38)
      }
      if (cancelled) return
      await sleep(420)
      setStreaming(true)

      for (let w = 2; w <= words.length; w += 2) {
        if (cancelled) return
        setShownWords(Math.min(w, words.length))
        await sleep(55)
      }
      if (cancelled) return
      setShownWords(words.length)
      await sleep(4200)
      if (cancelled) return
      setIndex((v) => (v + 1) % DEMO_QUERIES.length)
    }
    void cycle()
    return () => {
      cancelled = true
    }
  }, [query, words])

  const answer = words.slice(0, shownWords).join('')

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] blur-2xl"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 40%, rgba(59,91,255,0.25), transparent 72%)',
          }}
        />
        <div className="gradient-border gradient-border-on overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#EF4444]/70" />
            <span className="size-2.5 rounded-full bg-[#F59E0B]/70" />
            <span className="size-2.5 rounded-full bg-[#16A34A]/70" />
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              repotrackr
            </span>
          </div>
          <AnimatePresence mode="wait">
            {streaming ? (
              <motion.span
                key={response.intent}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <Badge variant="brand">
                  <Sparkles className="size-3" />
                  {INTENT_LABEL[response.intent] ?? response.intent}
                </Badge>
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-xs text-muted-foreground"
              >
                demo data
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <span className="glow-sm mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-canvas text-white">
              <Search className="size-3.5" />
            </span>
            <p className="font-mono text-sm text-foreground">
              {typed}
              <motion.span
                aria-hidden="true"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-brand"
              />
            </p>
          </div>

          <div className="min-h-28 rounded-xl bg-background/70 p-4">
            <p
              className={cn(
                'text-sm leading-relaxed text-foreground/90 transition-opacity',
                !streaming && 'opacity-40',
              )}
            >
              {renderInline(answer)}
              {streaming && shownWords < words.length ? (
                <span className="ml-0.5 inline-block h-4 w-1 translate-y-0.5 animate-pulse bg-muted-foreground" />
              ) : null}
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {streaming
                ? response.citations.map((citation) => (
                    <CitationChip
                      key={`${citation.file}:${citation.line}`}
                      citation={citation}
                    />
                  ))
                : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DEMO_QUERIES.map((q, i) => (
              <button
                key={q}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs transition-colors',
                  i === index
                    ? 'border-brand/40 bg-accent text-brand'
                    : 'border-border text-muted-foreground hover:border-brand/30 hover:text-foreground',
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
        </div>
      </div>

      <div className="gradient-border gradient-border-on noise relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-canvas p-5 glow-md">
        <div
          aria-hidden="true"
          className="dot-grid dot-grid-dark pointer-events-none absolute inset-0 opacity-60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(59,91,255,0.4), transparent 68%)',
          }}
        />
        <p className="relative text-sm font-medium text-white/90">Module graph</p>
        <p className="relative mt-0.5 text-xs text-white/50">
          Entry point ring, clusters by area, edges are imports.
        </p>
        <div className="relative mt-3 flex-1">
          <MiniGraph className="h-full min-h-56" />
        </div>
        <div className="relative mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/60">
          {[
            ['#3B5BFF', 'Core'],
            ['#16A34A', 'API'],
            ['#F59E0B', 'Auth'],
            ['#8B5CF6', 'Models'],
          ].map(([color, label]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 8px 1px ${color}`,
                }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
