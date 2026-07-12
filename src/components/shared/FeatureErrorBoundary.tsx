import React, { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface FeatureErrorBoundaryProps {
  featureName: string
  children: ReactNode
}

export function FeatureErrorBoundary({ featureName, children }: FeatureErrorBoundaryProps) {
  const fallbackUI = (
    <div className="p-6 bg-card border border-border rounded-2xl shadow-sm flex flex-col items-center justify-center text-center max-w-lg mx-auto my-8 space-y-4 animate-scale-in">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <div>
        <h3 className="font-bold text-base text-foreground" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Module Temporary Unavailable
        </h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-[340px] mx-auto">
          The <strong className="text-foreground">{featureName}</strong> module encountered an error. Your data is safe.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 px-4 py-2 bg-muted border border-border hover:bg-accent text-xs font-semibold rounded-lg transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Reload Module
      </button>
    </div>
  )

  return (
    <ErrorBoundary fallback={fallbackUI}>
      {children}
    </ErrorBoundary>
  )
}
