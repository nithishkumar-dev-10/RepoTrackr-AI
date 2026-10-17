import { Activity, Server, Trash2 } from 'lucide-react'

import { PageTransition } from '@/components/PageTransition'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { clearApiLog, useApiLog } from '@/lib/apiLog'
import { ENDPOINTS } from '@/lib/endpoints'
import { cn } from '@/lib/utils'

const METHOD_STYLE: Record<string, string> = {
  GET: 'border-transparent bg-status-done/15 text-status-done',
  POST: 'border-transparent bg-accent text-brand',
  DELETE: 'border-transparent bg-status-missing/15 text-status-missing',
}

function statusStyle(status: number): string {
  if (status === 0) return 'text-status-missing'
  if (status === 501) return 'text-muted-foreground'
  if (status >= 200 && status < 300) return 'text-status-done'
  if (status >= 400 && status < 500) return 'text-status-partial'
  return 'text-status-missing'
}

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function Developer() {
  const log = useApiLog()

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Developer
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Static analysis decides what is true. AI only retrieves and explains.
          </p>
        </div>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-brand" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                API activity
              </h2>
              <Badge variant="outline" className="font-mono">
                {log.length} recent
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearApiLog}
              disabled={log.length === 0}
            >
              <Trash2 className="size-4" />
              Clear
            </Button>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
            {log.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No API calls yet. Activity appears here as you use the app.
              </p>
            ) : (
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Method</th>
                      <th className="px-4 py-2 font-medium">Path</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Duration</th>
                      <th className="px-4 py-2 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="px-4 py-2">
                          <Badge className={cn('font-mono', METHOD_STYLE[entry.method])}>
                            {entry.method}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-foreground">
                          {entry.path}
                        </td>
                        <td
                          className={cn(
                            'px-4 py-2 font-mono text-xs',
                            statusStyle(entry.status),
                          )}
                        >
                          {entry.status === 0 ? 'network' : entry.status}
                          {entry.status === 501 ? ' · demo' : ''}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {entry.ms} ms
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {formatTime(entry.at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center gap-2">
            <Server className="size-4 text-brand" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Endpoints
            </h2>
          </div>

          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Method</th>
                    <th className="px-4 py-2 font-medium">Path</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((endpoint) => (
                    <tr
                      key={`${endpoint.method}-${endpoint.path}`}
                      className="border-b border-border/60 last:border-0"
                    >
                      <td className="px-4 py-2">
                        <Badge
                          className={cn('font-mono', METHOD_STYLE[endpoint.method])}
                        >
                          {endpoint.method}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-foreground">
                        {endpoint.path}
                      </td>
                      <td className="px-4 py-2">
                        {endpoint.availability === 'live' ? (
                          <Badge variant="done">Live</Badge>
                        ) : (
                          <Badge variant="unknown">Demo</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {endpoint.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </PageTransition>
  )
}
