export function DashboardPage() {
  const metrics = [
    { label: 'ESG Score', value: '74.2', delta: '+2.1', color: 'text-green-500' },
    { label: 'Environmental', value: '68', delta: '+1.5', color: 'text-blue-500' },
    { label: 'Social', value: '79', delta: '+3.2', color: 'text-purple-500' },
    { label: 'Governance', value: '76', delta: '+0.8', color: 'text-amber-500' },
  ]
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">Organization Dashboard</h2>
        <p className="text-muted-foreground text-sm mt-1">GreenTech Manufacturing Pvt. Ltd. — ESG Overview</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</p>
            <p className={`text-3xl font-bold mt-2 ${m.color}`}>{m.value}</p>
            <p className="text-xs text-green-500 mt-1">{m.delta} this month</p>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold mb-2">Welcome to EcoSphere AI</h3>
        <p className="text-sm text-muted-foreground">
          Navigate using the sidebar to access Environmental tracking, Social CSR management,
          Governance compliance, Gamification challenges, Mission Control AI, and Reports.
        </p>
      </div>
    </div>
  )
}
