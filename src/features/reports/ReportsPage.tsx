export function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">📊 Reports</h2>
        <p className="text-muted-foreground text-sm mt-1">Standard reports and custom report builder</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Environmental Report', desc: 'Carbon breakdown, goals, trends, heatmap', icon: '🌍' },
          { title: 'Social Report', desc: 'CSR participation, diversity, training', icon: '🤝' },
          { title: 'Governance Report', desc: 'Policy status, audits, compliance', icon: '🏛️' },
          { title: 'ESG Summary Report', desc: 'All modules + AI executive summary', icon: '📈' },
          { title: 'Custom Report Builder', desc: 'Build reports with 6 filter dimensions', icon: '🔧' },
        ].map((card) => (
          <div key={card.title} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="text-3xl">{card.icon}</div>
              <div>
                <h3 className="font-semibold">{card.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{card.desc}</p>
                <div className="flex gap-2 mt-3">
                  <button className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md hover:bg-primary/20 transition-colors">PDF</button>
                  <button className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md hover:bg-primary/20 transition-colors">Excel</button>
                  <button className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-md hover:bg-primary/20 transition-colors">CSV</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
