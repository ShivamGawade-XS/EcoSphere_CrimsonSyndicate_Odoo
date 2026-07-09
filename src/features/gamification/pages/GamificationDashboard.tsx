export function GamificationDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold">🎮 Gamification</h2>
        <p className="text-muted-foreground text-sm mt-1">Challenges, XP, badges, rewards and leaderboards</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Challenges', desc: 'Sustainability challenges with XP rewards', icon: '⚡' },
          { title: 'Badges', desc: 'Auto-awarded achievement badges', icon: '🏅' },
          { title: 'Rewards', desc: 'Redeem points for rewards', icon: '🎁' },
          { title: 'Leaderboard', desc: 'Individual and department rankings', icon: '🏆' },
          { title: 'Green Wallet', desc: 'Your XP, points and history', icon: '💚' },
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
