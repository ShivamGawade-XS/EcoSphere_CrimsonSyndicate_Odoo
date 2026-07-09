export function GovernanceDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">🏛️ Governance</h2>
        <p className="text-muted-foreground text-sm mt-1">Policies, audits, compliance issues and acknowledgements</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'ESG Policies', desc: 'Manage policy lifecycle', icon: '📋' },
          { title: 'Acknowledgements', desc: 'Track policy sign-offs', icon: '✅' },
          { title: 'Audits', desc: 'Schedule and manage audits', icon: '🔍' },
          { title: 'Compliance Issues', desc: 'Track and resolve violations', icon: '⚠️' },
        ].map((card) => (
          <div key={card.title} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="text-3xl mb-3">{card.icon}</div>
            <h3 className="font-semibold">{card.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
