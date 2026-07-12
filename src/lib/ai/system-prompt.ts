/**
 * EcoSphere AI — System Prompt Builder
 *
 * Converts an ESGContext snapshot into a rich, structured system prompt
 * for the Groq AI model. The prompt embeds live org data and instructs
 * the model to cite specific numbers and recommend actionable improvements.
 *
 * @module ai/system-prompt
 */

import type { ESGContext } from './context-builder'

export function buildSystemPrompt(context: ESGContext): string {
  const { currentScores, scoreVsPreviousMonth, topRisks, recentEmissions,
          openComplianceIssues, goalsOffTrack, pendingPolicyAcknowledgements,
          activeGamificationChallenges, topLeaderboardDepartments } = context

  const fmt = (n: number) => n.toFixed(1)
  const delta = (d: number) => d >= 0 ? `+${fmt(d)}` : fmt(d)

  const scoreSection = `
## Current ESG Scores (as of ${new Date(context.lastUpdated).toLocaleDateString('en-IN')})
| Pillar        | Score  | vs Last Month |
|---------------|--------|---------------|
| Overall       | ${fmt(currentScores.overall)}/100 | ${delta(currentScores.overall - scoreVsPreviousMonth.overall)} |
| Environmental | ${fmt(currentScores.environmental)}/100 | ${delta(currentScores.environmental - scoreVsPreviousMonth.environmental)} |
| Social        | ${fmt(currentScores.social)}/100 | ${delta(currentScores.social - scoreVsPreviousMonth.social)} |
| Governance    | ${fmt(currentScores.governance)}/100 | ${delta(currentScores.governance - scoreVsPreviousMonth.governance)} |`

  const risksSection = topRisks.length > 0
    ? `\n## Top Risks\n${topRisks.map((r, i) =>
        `${i + 1}. [${r.severity.toUpperCase()}] ${r.area}: ${r.issue}\n   Impact: ${r.impact}`
      ).join('\n')}`
    : '\n## Top Risks\nNo critical risks identified.'

  const emissionsSection = recentEmissions.length > 0
    ? `\n## Recent Emissions (Last 5 Transactions)\n${recentEmissions.map(e =>
        `- ${e.department}: ${e.amount.toLocaleString()} kg CO₂e on ${new Date(e.date).toLocaleDateString('en-IN')}`
      ).join('\n')}`
    : ''

  const complianceSection = openComplianceIssues.length > 0
    ? `\n## Open Compliance Issues (${openComplianceIssues.length})\n${openComplianceIssues.map(i =>
        `- [${i.severity.toUpperCase()}] ${i.description}\n  Owner: ${i.owner} | ${i.daysOverdue > 0 ? `⚠ ${i.daysOverdue} days overdue` : 'On track'}`
      ).join('\n')}`
    : '\n## Open Compliance Issues\nAll issues resolved.'

  const goalsSection = goalsOffTrack.length > 0
    ? `\n## Goals Off-Track\n${goalsOffTrack.map(g =>
        `- "${g.name}": ${g.current} / ${g.target} target by ${new Date(g.deadline).toLocaleDateString('en-IN')}`
      ).join('\n')}`
    : '\n## Goals Off-Track\nAll goals are on track.'

  const policySection = `\n## Policy Acknowledgements\n${pendingPolicyAcknowledgements.pctComplete}% complete — ${pendingPolicyAcknowledgements.count} pending acknowledgements outstanding.`

  const challengesSection = activeGamificationChallenges.length > 0
    ? `\n## Active Gamification Challenges\n${activeGamificationChallenges.map(c =>
        `- "${c.title}": ${c.participants} participants, deadline ${new Date(c.deadline).toLocaleDateString('en-IN')}`
      ).join('\n')}`
    : ''

  const leaderboardSection = topLeaderboardDepartments.length > 0
    ? `\n## Top Performing Departments\n${topLeaderboardDepartments.map((d, i) =>
        `${i + 1}. ${d.name} — ${d.score}/100`
      ).join('\n')}`
    : ''

  return `You are the EcoSphere AI Decision Copilot for ${context.orgName}, an executive-level ESG intelligence assistant.

## Your Role
You are embedded in ${context.orgName}'s ESG management platform. You have LIVE access to the organization's current ESG data shown below. You MUST:
- Always cite specific numbers from the data context provided (scores, counts, percentages, dates)
- Recommend concrete, actionable improvements with estimated score impact (e.g. "+3.5 Governance points")
- Reference relevant GRI 2021 or SASB standards where applicable (e.g. "per GRI 305-1")
- Keep answers executive-level: concise, impact-focused, and decision-ready
- Flag the most critical issues first
- Quantify risk in business terms when possible (regulatory penalties, reputational risk, score deductions)

## Tone Guidelines
- Executive briefing style: no fluff, direct recommendations
- Use bullet points for recommendations
- Bold key numbers and critical findings
- Always end with a "Recommended Next Action" if the user asks a broad question
${scoreSection}
${risksSection}
${emissionsSection}
${complianceSection}
${goalsSection}
${policySection}
${challengesSection}
${leaderboardSection}

## Framework References Available
- GRI 2021 Standards (Environmental: GRI 305, Social: GRI 400 series, Governance: GRI 2-9)
- SASB Industry Standards
- CSRD (Corporate Sustainability Reporting Directive) requirements
- TCFD (Task Force on Climate-related Financial Disclosures)

Remember: You have real-time access to ${context.orgName}'s live ESG data above. Refer to it directly in every answer.`
}

/**
 * Generate contextual starter questions based on ESG data state.
 * Returns up to 3 high-priority suggested questions the user should ask.
 */
export function buildStarterQuestions(context: ESGContext): string[] {
  const questions: string[] = []

  // Score drop → ask why
  const scoreDrop = context.currentScores.overall - context.scoreVsPreviousMonth.overall
  if (scoreDrop < -1) {
    questions.push(`Why did our overall ESG score drop by ${Math.abs(scoreDrop).toFixed(1)} points this month?`)
  }

  // Overdue compliance issues
  const overdueIssues = context.openComplianceIssues.filter(i => i.daysOverdue > 0)
  if (overdueIssues.length > 0) {
    questions.push(`What compliance issues are most urgent? We have ${overdueIssues.length} overdue.`)
  }

  // Off-track goals
  if (context.goalsOffTrack.length > 0) {
    const goal = context.goalsOffTrack[0]
    questions.push(`How can we get our "${goal.name}" goal back on track by ${new Date(goal.deadline).toLocaleDateString('en-IN')}?`)
  }

  // Pending policy acks
  if (context.pendingPolicyAcknowledgements.count > 0 && questions.length < 3) {
    questions.push(`How can we improve our policy acknowledgement rate from ${context.pendingPolicyAcknowledgements.pctComplete}% to 100%?`)
  }

  // Environmental emissions
  if (context.recentEmissions.length > 0 && questions.length < 3) {
    const top = context.recentEmissions[0]
    questions.push(`What actions can ${top.department} take to reduce their carbon emissions?`)
  }

  return questions.slice(0, 3)
}
