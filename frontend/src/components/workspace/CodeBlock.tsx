import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Syntax-highlighted snippet. Shiki is loaded lazily (dynamic import) so it
 * never ships in the initial bundle and only loads inside the workspace.
 */
export function CodeBlock({
  code,
  lang = 'python',
  className,
}: {
  code: string
  lang?: string
  className?: string
}) {
  const [html, setHtml] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { getSingletonHighlighter } = await import('shiki')
        const highlighter = await getSingletonHighlighter({
          themes: ['github-light'],
          langs: ['python', 'typescript', 'javascript'],
        })
        const loaded = highlighter.getLoadedLanguages()
        const language = loaded.includes(lang) ? lang : 'python'
        const out = highlighter.codeToHtml(code, {
          lang: language,
          theme: 'github-light',
        })
        if (!cancelled) setHtml(out)
      } catch {
        if (!cancelled) setHtml('')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [code, lang])

  if (!html) {
    return (
      <pre
        className={cn(
          'overflow-auto rounded-lg border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground',
          className,
        )}
      >
        {code}
      </pre>
    )
  }

  return (
    <div
      className={cn(
        'overflow-auto rounded-lg border border-border bg-background text-xs [&_pre]:m-0 [&_pre]:p-3 [&_code]:font-mono [&_code]:leading-relaxed',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
