import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  fallback: ReactNode
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * If the WebGL canvas fails at runtime (unsupported GPU, context loss, a
 * library error), fall back to the 2D graph so the workspace still works.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D canvas failed, falling back to 2D graph', error, info)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}
