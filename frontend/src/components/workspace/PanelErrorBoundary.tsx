import { AlertCircle, RotateCcw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: string | null
}

/** Keeps one broken tab from blanking the whole workspace. */
export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error: error.message || 'This panel could not be rendered.' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Workspace tab panel crashed', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="space-y-3 p-6">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p className="leading-relaxed">
              This panel could not be rendered: {this.state.error}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ error: null })}
          >
            <RotateCcw className="size-3.5" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
