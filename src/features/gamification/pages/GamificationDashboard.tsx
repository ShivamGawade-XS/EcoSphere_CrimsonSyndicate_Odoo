import { useState, useMemo } from 'react'
import { dbService } from '@/lib/dbService'
import {
  Challenge,
  ChallengeParticipation,
  Reward,
  RewardRedemption,
  Badge,
  BadgeAward,
  XPTransaction,
} from '@/types'
import {
  formatDate,
} from '@/lib/utils'
import {
  Trophy,
  Gift,
  Award,
  Wallet,
  Zap,
  CheckCircle,
  XCircle,
  FileText,
  User,
  ArrowUpRight,
  Sparkles,
  Search,
  Lock,
} from 'lucide-react'

export function GamificationDashboard() {
  const [activeTab, setActiveTab] = useState<'wallet' | 'challenges' | 'rewards' | 'leaderboards'>('wallet')
  const [refreshKey, setRefreshKey] = useState(0)

  // Load Data
  const currentUser = useMemo(() => dbService.getCurrentUser(), [refreshKey])
  const depts = useMemo(() => dbService.getDepartments(), [refreshKey])
  const profiles = useMemo(() => dbService.getProfiles(), [refreshKey])
  const challenges = useMemo(() => dbService.getChallenges(), [refreshKey])
  const participations = useMemo(() => dbService.getChallengeParticipations(), [refreshKey])
  const badges = useMemo(() => dbService.getBadges(), [refreshKey])
  const badgeAwards = useMemo(() => dbService.getBadgeAwards(), [refreshKey])
  const rewards = useMemo(() => dbService.getRewards(), [refreshKey])
  const redemptions = useMemo(() => dbService.getRedemptions(), [refreshKey])
  const xpTransactions = useMemo(() => dbService.getXPTransactions().filter(t => t.employee_id === currentUser.id), [refreshKey, currentUser.id])
  const deptScores = useMemo(() => dbService.getDepartmentScores(), [refreshKey])

  // Modals state
  const [showProofModal, setShowProofModal] = useState<Challenge | null>(null)
  const [proofUrl, setProofUrl] = useState('')
  const [proofNotes, setProofNotes] = useState('')
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<'individual' | 'challenges' | 'department'>('individual')

  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'esg_manager'

  // Leaderboards computation
  const individualLeaderboard = useMemo(() => {
    return [...profiles]
      .sort((a, b) => b.total_xp - a.total_xp)
      .slice(0, 20)
      .map((p, idx) => ({ ...p, rank: idx + 1 }))
  }, [profiles])

  const challengesLeaderboard = useMemo(() => {
    return [...profiles].map(p => {
      const doneCount = participations.filter(part => part.employee_id === p.id && part.approval_status === 'approved').length
      return {
        ...p,
        completedCount: doneCount
      }
    })
    .sort((a, b) => b.completedCount - a.completedCount)
    .slice(0, 20)
    .map((p, idx) => ({ ...p, rank: idx + 1 }))
  }, [profiles, participations])

  const departmentLeaderboard = useMemo(() => {
    return [...depts].map(d => {
      const scoreObj = deptScores.find(s => s.department_id === d.id)
      return {
        ...d,
        score: scoreObj ? scoreObj.total_score : 70
      }
    })
    .sort((a, b) => b.score - a.score)
    .map((d, idx) => ({ ...d, rank: idx + 1 }))
  }, [depts, deptScores])

  // Actions
  const handleJoinChallenge = (challengeId: string) => {
    dbService.joinChallenge(challengeId, currentUser.id)
    setRefreshKey(prev => prev + 1)
  }

  const handleProofSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!showProofModal || !proofUrl.trim()) return

    dbService.submitChallengeProof(showProofModal.id, currentUser.id, proofUrl, proofNotes)
    setShowProofModal(null)
    setProofUrl('')
    setProofNotes('')
    setRefreshKey(prev => prev + 1)
  }

  const handleApproveParticipation = (id: string, approve: boolean) => {
    try {
      dbService.approveChallengeParticipation(id, approve)
      setRefreshKey(prev => prev + 1)
    } catch (err: any) {
      alert(err.message || 'Approval failed')
    }
  }

  const handleRedeem = (rewardId: string) => {
    const reward = rewards.find(r => r.id === rewardId)
    if (!reward) return

    if (window.confirm(`Are you sure you want to redeem "${reward.name}" for ${reward.points_required} Points/XP?`)) {
      try {
        dbService.redeemReward(rewardId, currentUser.id)
        alert(`Redemption successful! ${reward.name} claimed.`)
        setRefreshKey(prev => prev + 1)
      } catch (err: any) {
        alert(err.message || 'Redemption failed.')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="text-emerald-500 w-7 h-7" />
            Gamification & Rewards
          </h2>
          <p className="text-muted-foreground text-sm">
            Participate in green challenges, unlock badges, earn XP, and redeem sustainable rewards.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { id: 'wallet', label: 'Green Wallet' },
          { id: 'challenges', label: 'Sustainability Challenges' },
          { id: 'rewards', label: 'Rewards Catalog' },
          { id: 'leaderboards', label: 'Leaderboards' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-5 py-3 text-sm font-medium border-b-2 -mb-[2px] transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Balance Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between bg-gradient-to-br from-emerald-500/10 to-teal-500/5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-emerald-600 tracking-wider">Employee Green Wallet</span>
                <Wallet className="w-5 h-5 text-emerald-500" />
              </div>

              {/* Points */}
              <div className="mt-4">
                <p className="text-3xl font-extrabold text-foreground">{currentUser.total_points}
                  <span className="text-lg font-bold text-emerald-600 ml-1">Pts</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  🛒 <strong>Points</strong> — used to redeem items from the Reward Catalog
                </p>
              </div>

              {/* XP separator */}
              <div className="mt-3 pt-3 border-t border-border/60">
                <p className="text-xl font-bold text-teal-500">{currentUser.total_xp}
                  <span className="text-sm font-bold text-teal-600 ml-1">XP</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  ⚡ <strong>XP</strong> — lifetime experience used for leaderboard ranking &amp; badges
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <span className="text-[10px] bg-emerald-500/20 text-emerald-800 px-2.5 py-0.5 rounded font-bold uppercase">
                Rank #{individualLeaderboard.find(x => x.id === currentUser.id)?.rank || '-'}
              </span>
            </div>
          </div>

          {/* Badges Section */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-base mb-4 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-500" /> Badge Gallery
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {badges.map((b) => {
                const unlocked = badgeAwards.some(a => a.badge_id === b.id && a.employee_id === currentUser.id)
                return (
                  <div key={b.id} className="flex flex-col items-center text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-sm border transition-all ${
                      unlocked ? 'bg-emerald-50 border-emerald-200' : 'bg-muted border-border opacity-50 grayscale'
                    }`}>
                      {unlocked ? b.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <span className="text-xs font-semibold mt-1.5 truncate w-full">{b.name}</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 truncate w-full">{b.description}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* XP History */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base mb-4 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-500" /> XP Audit Trail
              </h3>
              <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                {xpTransactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No transactions recorded.</p>
                ) : (
                  xpTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-xs border-b border-border/50 pb-2">
                      <div>
                        <p className="font-semibold truncate max-w-[150px]">{tx.description}</p>
                        <p className="text-[9px] text-muted-foreground">{formatDate(tx.created_at)}</p>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-600 flex items-center">
                        +{tx.amount} XP
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="space-y-6">
          {/* Challenges Listing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {challenges.map((chal) => {
              const joined = participations.some(p => p.challenge_id === chal.id && p.employee_id === currentUser.id)
              const participation = participations.find(p => p.challenge_id === chal.id && p.employee_id === currentUser.id)

              return (
                <div key={chal.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        chal.difficulty === 'easy' ? 'bg-green-50 text-green-700' :
                        chal.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {chal.difficulty}
                      </span>
                      {chal.deadline && (
                        <span className="text-[10px] text-muted-foreground font-mono">Ends: {formatDate(chal.deadline)}</span>
                      )}
                    </div>

                    <h4 className="font-bold text-lg text-foreground mt-3">{chal.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1.5">{chal.description}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                      <Zap className="w-4 h-4" /> {chal.xp_reward} XP
                    </span>

                    {joined ? (
                      participation?.approval_status === 'approved' ? (
                        <span className="text-xs text-green-600 font-bold uppercase bg-green-50 px-2 py-0.5 rounded">Completed</span>
                      ) : participation?.progress === 100 ? (
                        <span className="text-xs text-amber-600 font-bold uppercase bg-amber-50 px-2 py-0.5 rounded">Under Review</span>
                      ) : (
                        <button
                          onClick={() => setShowProofModal(chal)}
                          className="px-3.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-lg transition-all"
                        >
                          Submit Evidence
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handleJoinChallenge(chal.id)}
                        className="px-3.5 py-1 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold rounded-lg shadow-sm transition-all"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Manage Pending Submissions Panel */}
          {isManagerOrAdmin && (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mt-8">
              <div className="p-5 border-b border-border bg-muted/20">
                <h3 className="font-bold text-base">Challenge Submissions Approvals Pane</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Verify evidence requirements and mark challenges complete.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="py-3 px-6 font-semibold">Employee</th>
                      <th className="py-3 px-6 font-semibold">Challenge</th>
                      <th className="py-3 px-6 font-semibold">Status</th>
                      <th className="py-3 px-6 font-semibold">Attached Evidence</th>
                      <th className="py-3 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground text-sm">
                          No challenge logs recorded yet. Join and submit above.
                        </td>
                      </tr>
                    ) : (
                      participations.map((part) => {
                        const chal = challenges.find(c => c.id === part.challenge_id)
                        const userObj = profiles.find(u => u.id === part.employee_id)
                        return (
                          <tr key={part.id} className="border-b border-border hover:bg-muted/10">
                            <td className="py-3.5 px-6 font-medium">{userObj?.full_name}</td>
                            <td className="py-3.5 px-6">{chal?.title}</td>
                            <td className="py-3.5 px-6 capitalize">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                part.approval_status === 'approved' ? 'bg-green-50 text-green-700' :
                                part.approval_status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {part.approval_status}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-xs text-muted-foreground">
                              {part.proof_url ? (
                                <a href={part.proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 font-semibold">
                                  <FileText className="w-3.5 h-3.5" /> View Proof
                                </a>
                              ) : (
                                <span>No Proof Attached</span>
                              )}
                            </td>
                            <td className="py-3.5 px-6 text-right space-x-2">
                              {part.approval_status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleApproveParticipation(part.id, true)}
                                    className="text-green-600 hover:text-green-800 font-semibold text-xs"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleApproveParticipation(part.id, false)}
                                    className="text-red-500 hover:text-red-700 font-semibold text-xs"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((rew) => {
            const hasStock = rew.stock > 0
            const hasPoints = currentUser.total_points >= rew.points_required
            const isRedeemable = hasStock && hasPoints && rew.status === 'active'

            return (
              <div key={rew.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl">🎁</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      hasStock ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {hasStock ? `${rew.stock} left in stock` : 'Out of stock'}
                    </span>
                  </div>

                  <h4 className="font-bold text-base mt-4 text-foreground">{rew.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{rew.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-600">{rew.points_required} Points</span>
                  <button
                    disabled={!isRedeemable}
                    onClick={() => handleRedeem(rew.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isRedeemable
                        ? 'bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm'
                        : 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                    }`}
                  >
                    Redeem Reward
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'leaderboards' && (
        <div className="max-w-2xl bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Toggle buttons */}
          <div className="flex border-b border-border bg-muted/20 p-2 gap-2">
            {[
              { id: 'individual', label: 'Individual XP Rank' },
              { id: 'challenges', label: 'Challenges Completed' },
              { id: 'department', label: 'Department ESG Rank' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setSelectedLeaderboard(btn.id as any)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  selectedLeaderboard === btn.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Table List */}
          <div className="p-4">
            {selectedLeaderboard === 'individual' && (
              <div className="space-y-2">
                {individualLeaderboard.map((u) => (
                  <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    u.id === currentUser.id ? 'border-primary bg-primary/5 font-semibold' : 'border-border bg-card'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6">#{u.rank}</span>
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-600 uppercase">
                        {u.full_name.charAt(0)}
                      </div>
                      <span className="text-sm">{u.full_name}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{u.total_xp.toLocaleString()} XP</span>
                  </div>
                ))}
              </div>
            )}

            {selectedLeaderboard === 'challenges' && (
              <div className="space-y-2">
                {challengesLeaderboard.map((u) => (
                  <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    u.id === currentUser.id ? 'border-primary bg-primary/5 font-semibold' : 'border-border bg-card'
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6">#{u.rank}</span>
                      <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-xs font-bold text-teal-600 uppercase">
                        {u.full_name.charAt(0)}
                      </div>
                      <span className="text-sm">{u.full_name}</span>
                    </div>
                    <span className="text-xs font-bold text-teal-600">{u.completedCount} Completed</span>
                  </div>
                ))}
              </div>
            )}

            {selectedLeaderboard === 'department' && (
              <div className="space-y-2">
                {departmentLeaderboard.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-muted-foreground w-6">#{d.rank}</span>
                      <span className="text-sm font-medium">{d.name}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600">{d.score} ESG Score</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PROOF SUBMISSION MODAL */}
      {showProofModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-xl p-6 animate-fade-in">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Sparkles className="text-emerald-500 w-5 h-5" /> Submit Challenge Evidence
            </h3>
            <form onSubmit={handleProofSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Challenge</label>
                <p className="text-sm font-semibold">{showProofModal.title}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Evidence URL (Required)</label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/file/... or image link"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase block mb-1">Completion Notes</label>
                <textarea
                  placeholder="Add notes about your challenge progress..."
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowProofModal(null)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95"
                >
                  Submit Proof
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
