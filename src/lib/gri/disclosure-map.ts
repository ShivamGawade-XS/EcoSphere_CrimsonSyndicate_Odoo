/**
 * EcoSphere AI — GRI 2021 Disclosure Map
 *
 * Maps every EcoSphere data field to its GRI 2021 standard disclosure code.
 * Used for GRI compliance reporting and tooltip annotations on data entry forms.
 *
 * @module gri/disclosure-map
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type GRISeries = 'GRI 2' | 'GRI 3' | 'GRI 205' | 'GRI 302' | 'GRI 305' | 'GRI 401' | 'GRI 404' | 'GRI 405' | 'GRI 413'

export interface GRIDisclosure {
  code:        string
  series:      GRISeries
  title:       string
  description: string
  pillar:      'universal' | 'environmental' | 'social' | 'governance'
}

export type GRIStatus = 'reported' | 'partial' | 'not_reported'

export interface GRIDisclosureStatus extends GRIDisclosure {
  field:         string
  status:        GRIStatus
  currentValue:  string | null
  actionLink?:   string
}

export interface GRICoverageResult {
  score:       number  // 0–100%
  reported:    number
  partial:     number
  notReported: number
  total:       number
}

// ─── GRI 2021 Map ────────────────────────────────────────────────────────────

export const GRI_MAP: Record<string, GRIDisclosure> = {
  org_name: {
    code:        'GRI 2-1',
    series:      'GRI 2',
    title:       'Organizational details',
    description: 'Name, nature of ownership, countries of operation, and sector.',
    pillar:      'universal',
  },
  reporting_period: {
    code:        'GRI 2-3',
    series:      'GRI 2',
    title:       'Reporting period, frequency and contact point',
    description: 'Reporting period start/end, frequency, and contact for questions.',
    pillar:      'universal',
  },
  governance_structure: {
    code:        'GRI 2-9',
    series:      'GRI 2',
    title:       'Governance structure and composition',
    description: 'Structure and composition of the highest governance body.',
    pillar:      'governance',
  },
  policy_commitments: {
    code:        'GRI 2-23',
    series:      'GRI 2',
    title:       'Policy commitments',
    description: 'Policy commitments for responsible business conduct.',
    pillar:      'governance',
  },
  remediation_processes: {
    code:        'GRI 2-25',
    series:      'GRI 2',
    title:       'Processes to remediate negative impacts',
    description: 'Processes for remediating negative impacts on the environment.',
    pillar:      'governance',
  },
  compliance_laws: {
    code:        'GRI 2-27',
    series:      'GRI 2',
    title:       'Compliance with laws and regulations',
    description: 'Confirmed incidents of non-compliance and their handling.',
    pillar:      'governance',
  },
  esg_weights: {
    code:        'GRI 3-1',
    series:      'GRI 3',
    title:       'Process to determine material topics',
    description: 'Process for identifying and assessing material topics.',
    pillar:      'universal',
  },
  compliance_issues_corruption: {
    code:        'GRI 205-3',
    series:      'GRI 205',
    title:       'Confirmed incidents of corruption',
    description: 'Number of confirmed incidents of corruption and actions taken.',
    pillar:      'governance',
  },
  energy_consumption: {
    code:        'GRI 302-1',
    series:      'GRI 302',
    title:       'Energy consumption within the organization',
    description: 'Total energy consumption within the organisation in joules or MWh.',
    pillar:      'environmental',
  },
  scope1_emissions: {
    code:        'GRI 305-1',
    series:      'GRI 305',
    title:       'Direct (Scope 1) GHG emissions',
    description: 'Gross direct (Scope 1) GHG emissions in metric tonnes of CO₂ equivalent.',
    pillar:      'environmental',
  },
  scope2_emissions: {
    code:        'GRI 305-2',
    series:      'GRI 305',
    title:       'Energy indirect (Scope 2) GHG emissions',
    description: 'Gross location-based and market-based Scope 2 GHG emissions.',
    pillar:      'environmental',
  },
  scope3_emissions: {
    code:        'GRI 305-3',
    series:      'GRI 305',
    title:       'Other indirect (Scope 3) GHG emissions',
    description: 'Gross Scope 3 GHG emissions from value chain activities.',
    pillar:      'environmental',
  },
  emission_reduction_target: {
    code:        'GRI 305-5',
    series:      'GRI 305',
    title:       'Reduction of GHG emissions',
    description: 'GHG emission reductions achieved as a direct result of reduction initiatives.',
    pillar:      'environmental',
  },
  total_employees: {
    code:        'GRI 401-1',
    series:      'GRI 401',
    title:       'New employee hires and employee turnover',
    description: 'Total number and rate of new employee hires and employee turnover.',
    pillar:      'social',
  },
  training_hours: {
    code:        'GRI 404-1',
    series:      'GRI 404',
    title:       'Average hours of training per year per employee',
    description: 'Average hours of training per year per employee by gender and category.',
    pillar:      'social',
  },
  diversity_metrics: {
    code:        'GRI 405-1',
    series:      'GRI 405',
    title:       'Diversity of governance bodies and employees',
    description: 'Percentage of individuals in governance bodies and employees by category.',
    pillar:      'social',
  },
  csr_community_investment: {
    code:        'GRI 413-1',
    series:      'GRI 413',
    title:       'Operations with local community engagement',
    description: 'Operations with local community engagement and development programs.',
    pillar:      'social',
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Determine GRI disclosure status for a given field based on its current value */
export function getGRIStatus(field: string, value: any): GRIStatus {
  if (value === null || value === undefined) return 'not_reported'
  if (typeof value === 'number') {
    if (value === 0) return 'partial'
    return 'reported'
  }
  if (typeof value === 'string') {
    if (value.trim() === '') return 'not_reported'
    if (value === 'unknown' || value === 'n/a') return 'partial'
    return 'reported'
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'not_reported'
    return 'reported'
  }
  return 'partial'
}

/** Calculate overall GRI coverage score (0–100) */
export function calculateGRICoverage(
  statuses: GRIStatus[]
): GRICoverageResult {
  const total      = statuses.length
  const reported   = statuses.filter(s => s === 'reported').length
  const partial    = statuses.filter(s => s === 'partial').length
  const notReported = statuses.filter(s => s === 'not_reported').length
  // partial counts as 0.5
  const score = total > 0 ? Math.round(((reported + partial * 0.5) / total) * 100) : 0

  return { score, reported, partial, notReported, total }
}

/** Return all GRI fields sorted by pillar, then by code */
export function getAllGRIFields(): string[] {
  return Object.keys(GRI_MAP).sort((a, b) =>
    GRI_MAP[a].code.localeCompare(GRI_MAP[b].code)
  )
}

/** Get GRI disclosure by field key */
export function getGRIDisclosure(field: string): GRIDisclosure | null {
  return GRI_MAP[field] ?? null
}

/** Get GRI badge text for UI tooltip usage */
export function getGRIBadgeText(field: string): string {
  const d = GRI_MAP[field]
  if (!d) return ''
  return `${d.code} — ${d.title}`
}

// ─── Dashboard helper ─────────────────────────────────────────────────────────

export interface GRIDashboardItem {
  code:   string
  title:  string
  pillar: 'E' | 'S' | 'G' | 'universal'
  status: 'met' | 'partial' | 'gap'
}

/**
 * Returns all GRI disclosures mapped to simplified E/S/G pillar codes
 * and 'met'/'partial'/'gap' status for dashboard widgets.
 * Status is deterministic from field-key position in GRI_MAP.
 */
export function getGRIDisclosureMap(): GRIDashboardItem[] {
  const keys = Object.keys(GRI_MAP)
  // Assign deterministic status — in a real app this comes from live org data
  const statusSeed: Record<string, 'met' | 'partial' | 'gap'> = {
    org_name:                    'met',
    reporting_period:            'met',
    governance_structure:        'met',
    anti_corruption:             'partial',
    energy_consumption:          'met',
    energy_intensity:            'partial',
    ghg_emissions_scope1:        'met',
    ghg_emissions_scope2:        'met',
    ghg_emissions_scope3:        'partial',
    new_employee_hires:          'met',
    training_hours:              'partial',
    diversity_gender:            'met',
    csr_community_investment:    'gap',
  }

  return keys.map(key => {
    const d = GRI_MAP[key]
    const rawPillar = d.pillar
    const pillar: 'E' | 'S' | 'G' | 'universal' =
      rawPillar === 'environmental' ? 'E'
      : rawPillar === 'social' ? 'S'
      : rawPillar === 'governance' ? 'G'
      : 'universal'
    const status = statusSeed[key] ?? 'partial'
    return { code: d.code, title: d.title, pillar, status }
  })
}
