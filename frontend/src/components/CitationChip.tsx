import { FileCode2 } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Citation } from '@/types'

/** `file:line` chip with the code snippet on hover. Reused across modes. */
export function CitationChip({
  citation,
  onClick,
  active = false,
  className,
}: {
  citation: Citation
  onClick?: () => void
  active?: boolean
  className?: string
}) {
  const label = `${citation.file}:${citation.line}`
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs transition-[color,border-color,box-shadow] duration-200',
            active
              ? 'border-brand/40 bg-accent text-brand glow-sm'
              : 'border-border bg-surface text-muted-foreground hover:border-brand/40 hover:text-brand hover:glow-sm',
            className,
          )}
          title={label}
        >
          <FileCode2 className="size-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-md bg-canvas p-0 font-mono text-[11px] leading-relaxed text-white/90"
      >
        <pre className="max-h-56 overflow-auto p-3 whitespace-pre-wrap">
          {citation.snippet}
        </pre>
      </TooltipContent>
    </Tooltip>
  )
}
