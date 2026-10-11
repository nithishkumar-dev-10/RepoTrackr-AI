import { motion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'

import { CitationChip } from '@/components/CitationChip'
import { Badge } from '@/components/ui/badge'
import type { QueryResponse } from '@/types'

/** Generic answer renderer: answer text plus cited `file:line` chips. */
export function AnswerView({
  response,
  query,
  demo,
  loading,
  onCitationClick,
  onSelectFile,
  selectedFile,
}: {
  response?: QueryResponse
  query?: string
  demo?: boolean
  loading?: boolean
  onCitationClick?: (file: string, line: number) => void
  onSelectFile?: (file: string) => void
  selectedFile?: string | null
}) {
  if (loading && !response) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Analyzing the codebase…
      </div>
    )
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
        <Sparkles className="size-5 text-brand" />
        <p>Ask a question with ⌘K to get an explanation grounded in code.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {query ? (
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Query
        </p>
      ) : null}
      {query ? (
        <p className="text-sm font-medium text-foreground">{query}</p>
      ) : null}

      <div className="flex items-center gap-2">
        {/* Every claim cites real code (file:line). */}
        <p className="text-xs text-muted-foreground">
          Every claim cites real code (file:line).
        </p>
        {demo ? (
          <Badge variant="outline" className="font-mono">
            Demo data
          </Badge>
        ) : null}
      </div>

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="whitespace-pre-wrap text-sm leading-relaxed text-foreground"
      >
        {response.answer}
      </motion.p>

      {response.citations.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Citations
          </p>
          <div className="flex flex-wrap gap-2">
            {response.citations.map((citation, i) => (
              <CitationChip
                key={`${citation.file}-${citation.line}-${i}`}
                citation={citation}
                active={selectedFile === citation.file}
                onClick={() => {
                  onCitationClick?.(citation.file, citation.line)
                  onSelectFile?.(citation.file)
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
