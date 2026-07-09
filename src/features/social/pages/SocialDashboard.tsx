export function SocialDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">🤝 Social</h2>
        <p className="text-muted-foreground text-sm mt-1">CSR activities, employee participation, diversity metrics</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'CSR Activities', desc: 'Manage and track CSR initiatives', icon: '🌱' },
          { title: 'Employee Participation', desc: 'Track approvals and proof uploads', icon: '👥' },
          { title: 'Diversity Metrics', desc: 'Monitor org-wide diversity data', icon: '📊' },
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
