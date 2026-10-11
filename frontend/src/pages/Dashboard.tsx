import { AnimatePresence, motion } from 'framer-motion'
import { Boxes, Plus, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { startIndex } from '@/api/galaxy'
import { listRepos } from '@/api/repos'
import { RepoCard } from '@/components/dashboard/RepoCard'
import { TrackRepoModal } from '@/components/dashboard/TrackRepoModal'
import { PageTransition } from '@/components/PageTransition'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [repos, setRepos] = useState<Repo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [indexing, setIndexing] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await listRepos()
      setRepos(data.repos)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load your repositories.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const name = useMemo(() => user?.email?.split('@')[0] ?? 'there', [user])

  async function handleIndex(repo: Repo) {
    setIndexing((prev) => new Set(prev).add(repo.id))
    try {
      const result = await startIndex(repo.id)
      toast({
        title:
          result.data.status === 'not_implemented'
            ? 'Indexing queued (Demo data)'
            : 'Indexing started',
        description: `${repo.owner}/${repo.name}`,
        variant: 'info',
      })
    } catch {
      toast({ title: 'Could not start indexing', variant: 'error' })
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
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={loading ? 'size-4 animate-spin' : 'size-4'} />
              Refresh
            </Button>
            <Button variant="brand" onClick={() => setModalOpen(true)}>
              <Plus className="size-4" />
              Track repository
            </Button>
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
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : repos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-20 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-accent text-brand">
                <Boxes className="size-6" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                No repositories yet
              </h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add a public GitHub repository to build its graph and start
                asking questions.
              </p>
              <Button
                variant="brand"
                className="mt-5"
                onClick={() => setModalOpen(true)}
              >
                <Plus className="size-4" />
                Track your first repository
              </Button>
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
