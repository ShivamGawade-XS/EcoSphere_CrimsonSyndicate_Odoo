// Environmental Dashboard — stub (full implementation in progress)
export function EnvironmentalDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">🌍 Environmental</h2>
        <p className="text-muted-foreground text-sm mt-1">Carbon tracking, emission factors, sustainability goals</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'Carbon Transactions', desc: 'Track emissions from operations', icon: '💨' },
          { title: 'Emission Factors', desc: 'Configure CO₂e conversion factors', icon: '⚗️' },
          { title: 'Sustainability Goals', desc: 'Monitor progress toward targets', icon: '🎯' },
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
