import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-100">Something went wrong</h2>
          <p className="mt-2 max-w-md text-sm text-gray-400">
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-white/[0.1] hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Reload page
            </button>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] border border-white/[0.08] px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:bg-white/[0.1] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
