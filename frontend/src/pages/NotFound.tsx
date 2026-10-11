import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { PageTransition } from '@/components/PageTransition'

export default function NotFound() {
  return (
    <PageTransition>
      <div className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Page not found
        </h1>
        <Button asChild variant="brand">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </PageTransition>
  )
}
