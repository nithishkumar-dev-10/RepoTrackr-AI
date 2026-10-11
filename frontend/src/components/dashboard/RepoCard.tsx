import { motion } from 'framer-motion'
import { ArrowUpRight, Boxes, Loader2 } from 'lucide-react'

import { MiniGraphThumb } from '@/components/dashboard/MiniGraphThumb'
import { SpotlightCard } from '@/components/SpotlightCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { mapRepoStatus, REPO_STATUS_LABEL } from '@/api/repos'
import { cn } from '@/lib/utils'
import type { Repo, UiRepoStatus } from '@/types'

const STATUS_STYLE: Record<UiRepoStatus, { chip: string; dot: string }> = {
  not_indexed: {
    chip: 'border-transparent bg-status-unknown/20 text-muted-foreground',
    dot: 'bg-status-unknown',
  },
  indexing: {
    chip: 'border-transparent bg-status-partial/15 text-status-partial',
    dot: 'bg-status-partial animate-pulse',
  },
  ready: {
    chip: 'border-transparent bg-status-done/15 text-status-done',
    dot: 'bg-status-done',
  },
  error: {
    chip: 'border-transparent bg-status-missing/15 text-status-missing',
    dot: 'bg-status-missing',
  },
}

export function RepoCard({
  repo,
  indexState,
  onOpen,
  onIndex,
}: {
  repo: Repo
  indexState: 'idle' | 'indexing'
  onOpen: () => void
  onIndex: () => void
}) {
  const status = indexState === 'indexing' ? 'indexing' : mapRepoStatus(repo.status)
  const style = STATUS_STYLE[status]

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
    >
      <SpotlightCard className="flex h-full flex-col">
        <div className="relative h-32 overflow-hidden rounded-t-2xl bg-canvas">
          <MiniGraphThumb seed={repo.id} className="h-full w-full opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas/60 to-transparent" />
          <Badge className={cn('absolute left-3 top-3', style.chip)}>
            <span className={cn('size-1.5 rounded-full', style.dot)} />
            {REPO_STATUS_LABEL[status]}
          </Badge>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <p className="truncate text-base font-semibold text-foreground">
            {repo.name}
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {repo.owner}/{repo.name}
          </p>

          <div className="mt-5 flex items-center gap-2">
            <Button
              variant="brand"
              size="sm"
              className="flex-1"
              onClick={onOpen}
            >
              Open
              <ArrowUpRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onIndex}
              disabled={indexState === 'indexing'}
            >
              {indexState === 'indexing' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Boxes className="size-4" />
              )}
              Index
            </Button>
          </div>
        </div>
      </SpotlightCard>
    </motion.div>
  )
}
