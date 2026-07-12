import React, { Component, ErrorInfo, ReactNode, ComponentType } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    } else {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset()
    }
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-background">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Something went wrong</h3>
                <p className="text-xs text-muted-foreground">An unexpected error occurred in this view.</p>
              </div>
            </div>

            {this.state.error && (
              <details className="text-xs border border-border bg-muted/30 rounded-xl p-3 select-text overflow-hidden">
                <summary className="cursor-pointer font-semibold text-muted-foreground select-none outline-none">Error Details</summary>
                <div className="mt-2 text-red-400 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-40">
                  {this.state.error.toString()}
                </div>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export interface WithErrorBoundaryOptions {
  fallback?: ReactNode
  onReset?: () => void
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

export function withErrorBoundary<T extends object>(
  Component: ComponentType<T>,
  options: WithErrorBoundaryOptions = {}
): ComponentType<T> {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...options}>
      <Component {...props} />
    </ErrorBoundary>
  )
  WrappedComponent.displayName = `WithErrorBoundary(${Component.displayName || Component.name || 'Component'})`
  return WrappedComponent
}
