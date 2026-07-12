import { letterGrade, scoreColor } from '@/lib/esgUtils'

interface ScoreBadgeProps {
  score: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
  showGrade?: boolean
  className?: string
}

const sizeMap = {
  sm:  { ring: 'w-12 h-12', text: 'text-sm',  label: 'text-[9px]', stroke: 3, r: 18 },
  md:  { ring: 'w-16 h-16', text: 'text-base', label: 'text-[10px]', stroke: 3.5, r: 24 },
  lg:  { ring: 'w-24 h-24', text: 'text-xl',  label: 'text-xs',  stroke: 4, r: 36 },
}

function scoreStroke(score: number): string {
  if (score >= 80) return '#34d399' // emerald
  if (score >= 60) return '#facc15' // yellow
  if (score >= 40) return '#fb923c' // orange
  return '#f87171'                  // red
}

/**
 * Circular SVG progress ring showing an ESG score (0-100) with
 * a colour-coded stroke and optional letter grade.
 */
export function ScoreBadge({ score, label, size = 'md', showGrade = true, className = '' }: ScoreBadgeProps) {
  const { ring, text, label: labelSize, stroke, r } = sizeMap[size]
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference
  const colour = scoreStroke(score)
  const grade = letterGrade(score)

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <div className={`relative ${ring} flex items-center justify-center`}>
        <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${(r + stroke) * 2} ${(r + stroke) * 2}`}>
          {/* Background ring */}
          <circle
            cx={r + stroke}
            cy={r + stroke}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-white/10"
          />
          {/* Score ring */}
          <circle
            cx={r + stroke}
            cy={r + stroke}
            r={r}
            fill="none"
            stroke={colour}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="text-center leading-none">
          <span className={`font-bold ${text} ${scoreColor(score)}`}>{score.toFixed(0)}</span>
          {showGrade && <div className={`${labelSize} text-muted-foreground font-medium`}>{grade}</div>}
        </div>
      </div>
      {label && <span className={`${labelSize} text-muted-foreground text-center font-medium`}>{label}</span>}
    </div>
  )
}

/**
 * Horizontal pill badge for inline score display.
 */
export function ScorePill({ score, label }: { score: number; label: string }) {
  const colour = scoreStroke(score)
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={{ borderColor: colour + '40', backgroundColor: colour + '15', color: colour }}
    >
      {label}: {score.toFixed(0)}
    </span>
  )
}
