import { Link } from 'react-router-dom'
import { LayoutDashboard, Leaf } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-8">
      <div className="mb-6">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
          <Leaf className="w-10 h-10 text-primary" />
        </div>
        <p className="text-8xl font-black text-foreground/8 select-none" style={{ fontFamily: 'Outfit, sans-serif' }}>404</p>
        <h1 className="text-2xl font-bold text-foreground -mt-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Page not found</h1>
        <p className="text-muted-foreground text-sm mt-2 max-w-[320px] mx-auto">
          This page doesn't exist in your ESG workspace. Check the URL or navigate back to the dashboard.
        </p>
      </div>
      <Link
        to="/dashboard"
        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
      >
        <LayoutDashboard className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  )
}
