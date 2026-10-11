import { GitBranch, Loader2 } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { createRepo } from '@/api/repos'
import { FloatingInput } from '@/components/auth/FloatingInput'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/context/ToastContext'
import { parseGithubUrl } from '@/lib/github'
import type { Repo } from '@/types'

export function TrackRepoModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (repo: Repo) => void
}) {
  const { toast } = useToast()
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setUrl('')
    setError('')
    setSubmitting(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setError('')
    const ref = parseGithubUrl(url)
    if (!ref) {
      setError('Enter a public GitHub URL like github.com/owner/name')
      return
    }
    setSubmitting(true)
    try {
      const repo = await createRepo(ref.url)
      onCreated(repo)
      toast({ title: 'Repository tracked', description: ref.url, variant: 'success' })
      reset()
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not add the repository.'
      setError(message)
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-canvas text-canvas">
            <GitBranch className="size-5" />
          </span>
          <div>
            <DialogTitle>Track a repository</DialogTitle>
            <DialogDescription>
              Add a public GitHub repo to analyze.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <FloatingInput
            label="GitHub repository URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            error={error}
            hint="Only public github.com/owner/name repositories are supported."
            autoFocus
            disabled={submitting}
          />
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <GitBranch className="size-4" />
              )}
              Track repository
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
