import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { WORKSPACE_MODES, type WorkspaceMode } from '@/components/workspace/ModeTabs'
import { cn } from '@/lib/utils'

const PLACEHOLDER: Record<WorkspaceMode, string> = {
  reader: 'Explain how auth works end to end',
  plan: 'Verify that the plan for refresh tokens is implemented',
  context: 'Pack context to add pagination to /repos',
}

export function CommandBar({
  mode,
  onRun,
}: {
  mode: WorkspaceMode
  onRun: (query: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const active = WORKSPACE_MODES.find((m) => m.id === mode)

  function submit(event: FormEvent) {
    event.preventDefault()
    const query = value.trim()
    if (!query) return
    onRun(query)
    setValue('')
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full justify-start gap-2 text-muted-foreground sm:w-72"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Ask about this repo</span>
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="sr-only">Ask about this repo</DialogTitle>
          <form onSubmit={submit}>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={PLACEHOLDER[mode]}
                className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {WORKSPACE_MODES.map((m) => (
                <span
                  key={m.id}
                  className={cn(
                    'rounded-md px-2 py-1 text-xs',
                    m.id === mode ? 'bg-accent text-brand' : 'text-muted-foreground',
                  )}
                >
                  {m.label}
                </span>
              ))}
              <span className="ml-auto text-xs text-muted-foreground">
                Running in {active?.label} mode
              </span>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
