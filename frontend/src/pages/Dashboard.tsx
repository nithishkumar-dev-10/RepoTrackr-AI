import { AnimatePresence, motion } from 'framer-motion'
import { Boxes, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ApiError } from '@/api/client'
import { startIndex } from '@/api/galaxy'
import { isRepoStatusActive, listRepos } from '@/api/repos'
import { RepoCard } from '@/components/dashboard/RepoCard'
import { TrackRepoModal } from '@/components/dashboard/TrackRepoModal'
import { GlowButton } from '@/components/GlowButton'
import { PageTransition } from '@/components/PageTransition'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AccentIcon } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import type { Repo } from '@/types'

function greeting(date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user, status: authStatus } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [indexing, setIndexing] = useState<Set<number>>(new Set())

  // One loader for the first render, the Refresh button and the Retry action.
  // `alive` guards against an unmounted or superseded request writing state.
  const load = useCallback(async (alive: () => boolean = () => true) => {
    try {
      const data = await listRepos()
      if (!alive()) return
      setRepos(data.repos)
      setError('')
    } catch (err) {
      if (!alive()) return
      setError(
        err instanceof Error ? err.message : 'Could not load your repositories.',
      )
    } finally {
      if (alive()) setLoading(false)
    }
  }, [])

  // Silent refresh for badge polling; does not flash the page skeleton.
  const refreshStatuses = useCallback(async () => {
    try {
      const data = await listRepos()
      setRepos(data.repos)
    } catch {
      // Keep the last known statuses; the manual Refresh button shows errors.
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      // All state writes happen after the awaited fetch, so this effect only
      // synchronizes with the API and never triggers a synchronous re-render.
      await load(() => !cancelled)
    })()
    return () => {
      cancelled = true
    }
  }, [load])

  // Poll every 2.5s while any repo is queued/cloning/indexing; cleanup on
  // unmount and as soon as no repo needs polling.
  useEffect(() => {
    if (
      authStatus !== 'authenticated' ||
      loading ||
      !repos.some((repo) => isRepoStatusActive(repo.status))
    ) {
      return
    }
    const timer = window.setInterval(() => {
      void refreshStatuses()
    }, 2500)
    return () => window.clearInterval(timer)
  }, [authStatus, loading, repos, refreshStatuses])

  const name = useMemo(() => user?.email?.split('@')[0] ?? 'there', [user])

  async function handleIndex(repo: Repo) {
    setIndexing((prev) => new Set(prev).add(repo.id))
    try {
      const result = await startIndex(repo.id)
      setRepos((prev) =>
        prev.map((item) =>
          item.id === repo.id
            ? { ...item, status: result.status, error_message: null }
            : item,
        ),
      )
      toast({
        title: 'Indexing queued',
        description: `${repo.owner}/${repo.name}`,
        variant: 'info',
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast({
          title: 'Already indexing',
          description: err.message,
          variant: 'info',
        })
      } else {
        toast({
          title: 'Could not start indexing',
          description: err instanceof Error ? err.message : undefined,
          variant: 'error',
        })
      }
    } finally {
      window.setTimeout(() => {
        setIndexing((prev) => {
          const next = new Set(prev)
          next.delete(repo.id)
          return next
        })
      }, 1200)
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {greeting()}, {name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track a Python repo and explore it from three angles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true)
                setError('')
                void load()
              }}
              disabled={loading}
            >
              <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
              Refresh
            </Button>
            <GlowButton variant="brand" onClick={() => setModalOpen(true)}>
              <Plus className="size-4" />
              Track repository
            </GlowButton>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-border bg-surface"
                >
                  <Skeleton className="h-32 rounded-none" />
                  <div className="space-y-3 p-5">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-9 flex-1" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoading(true)
                    setError('')
                    void load()
                  }}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : repos.length === 0 ? (
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-brand/30 bg-gradient-to-b from-brand-tint/70 to-surface px-6 py-20 text-center">
              <div
                aria-hidden="true"
                className="dot-grid pointer-events-none absolute inset-0 opacity-40"
              />
              <div className="relative flex flex-col items-center">
                <AccentIcon accent="brand" className="size-14 rounded-2xl shadow-card">
                  <Boxes className="size-6" />
                </AccentIcon>
                <h2 className="mt-4 text-lg font-semibold text-foreground">
                  No repositories yet
                </h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Add a public GitHub repository to build its graph and start
                  asking questions.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {['Code graph', 'Reader', 'Plan verifier', 'Context packer'].map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <GlowButton
                  variant="brand"
                  className="mt-5"
                  onClick={() => setModalOpen(true)}
                >
                  <Plus className="size-4" />
                  Track your first repository
                </GlowButton>
              </div>
            </div>
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.07 } } }}
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence>
                {repos.map((repo) => (
                  <RepoCard
                    key={repo.id}
                    repo={repo}
                    indexState={indexing.has(repo.id) ? 'indexing' : 'idle'}
                    onOpen={() => navigate(`/repo/${repo.id}`)}
                    onIndex={() => void handleIndex(repo)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      <TrackRepoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={(repo) => setRepos((prev) => [repo, ...prev])}
      />
    </PageTransition>
  )
}
