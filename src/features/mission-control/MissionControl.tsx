export function MissionControl() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">⚡ Mission Control</h2>
          <p className="text-muted-foreground text-sm mt-1">AI-powered ESG Decision Intelligence</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Live
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ESG Health */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">ESG Health</h3>
          <div className="text-center">
            <p className="text-5xl font-bold text-primary">74.2</p>
            <p className="text-sm text-muted-foreground mt-1">Organization ESG Score</p>
            <p className="text-xs text-green-500 mt-1">↑ 2.1 pts vs last month</p>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { label: 'Environmental', score: 68, color: 'bg-blue-500' },
              { label: 'Social', score: 79, color: 'bg-purple-500' },
              { label: 'Governance', score: 76, color: 'bg-amber-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24">{item.label}</span>
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
                <span className="text-xs font-mono w-8 text-right">{item.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">🤖 AI Recommendations</h3>
          <div className="space-y-3">
            {[
              {
                module: 'Governance',
                issue: '3 overdue compliance issues',
                impact: '₹2.1 Cr risk exposure',
                action: 'Assign and resolve critical issues',
                esgGain: '+4 pts',
              },
              {
                module: 'Environmental',
                issue: 'Carbon goal off trajectory',
                impact: '15% above target',
                action: 'Review fleet emission factors',
                esgGain: '+3 pts',
              },
            ].map((rec) => (
              <div key={rec.issue} className="p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-primary font-medium">{rec.module}</span>
                  <span className="text-xs text-green-500 font-semibold">{rec.esgGain}</span>
                </div>
                <p className="text-xs font-medium">{rec.issue}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{rec.impact}</p>
                <p className="text-xs text-foreground mt-1">→ {rec.action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-4">🚨 Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-200 dark:border-red-900">
              <span className="text-red-500">⚠️</span>
              <div>
                <p className="text-xs font-semibold text-red-600">3 Overdue Issues</p>
                <p className="text-xs text-muted-foreground">Past due date, needs action</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-900">
              <span className="text-amber-500">🎯</span>
              <div>
                <p className="text-xs font-semibold text-amber-600">2 Goals at Risk</p>
                <p className="text-xs text-muted-foreground">Off trajectory by &gt;20%</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-900">
              <span className="text-blue-500">📋</span>
              <div>
                <p className="text-xs font-semibold text-blue-600">5 Policies Unacknowledged</p>
                <p className="text-xs text-muted-foreground">Reminders sent to employees</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
