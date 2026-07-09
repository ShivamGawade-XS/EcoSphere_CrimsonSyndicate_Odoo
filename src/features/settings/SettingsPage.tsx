export function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">⚙️ Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">Organization configuration and administration</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Organization', desc: 'Name, logo, ESG weights', icon: '🏢' },
          { title: 'Feature Toggles', desc: 'Auto emissions, evidence, badge auto-award', icon: '🔧' },
          { title: 'Departments', desc: 'Hierarchical department management', icon: '🏗️' },
          { title: 'Categories', desc: 'CSR activity and challenge categories', icon: '🏷️' },
          { title: 'Users', desc: 'Invite, roles, and department assignment', icon: '👤' },
          { title: 'Notifications', desc: 'In-app and email notification settings', icon: '🔔' },
        ].map((card) => (
          <div key={card.title} className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="text-2xl">{card.icon}</div>
              <div>
                <h3 className="font-semibold">{card.title}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{card.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
