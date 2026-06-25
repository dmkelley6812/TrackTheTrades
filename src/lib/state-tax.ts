import type { FilingStatus, TaxBracket } from '../types'
import { computeProgressiveTax } from './tax-brackets'

// ─── State Tax Provider ───────────────────────────────────────────────────────

export type StateTaxType = 'none' | 'flat' | 'progressive'

export interface StateTaxEntry {
  code: string
  name: string
  type: StateTaxType
  flatRate?: number
  // For progressive states: brackets keyed by filing status.
  // If MFJ/HOH/MFS not provided, they are derived from single (see computeStateTax).
  brackets?: Partial<Record<FilingStatus, TaxBracket[]>>
  notes?: string
}

// ─── State Tax Table (2024-2025) ──────────────────────────────────────────────

// Brackets represent state taxable income after any state-specific deductions.
// For simplicity this engine does not apply per-state personal exemptions or
// state standard deductions separately — the federal deduction (already applied)
// serves as a reasonable proxy for reserve estimation purposes.

export const STATE_TAX_TABLE: StateTaxEntry[] = [
  // ── No income tax ────────────────────────────────────────────────────────────
  { code: 'AK', name: 'Alaska',        type: 'none' },
  { code: 'FL', name: 'Florida',       type: 'none' },
  { code: 'NV', name: 'Nevada',        type: 'none' },
  { code: 'NH', name: 'New Hampshire', type: 'none' },
  { code: 'SD', name: 'South Dakota',  type: 'none' },
  { code: 'TN', name: 'Tennessee',     type: 'none' },
  { code: 'TX', name: 'Texas',         type: 'none' },
  // WA has a 7% LTCG tax on gains over $262k but no general income tax
  { code: 'WA', name: 'Washington',    type: 'none', notes: 'WA has a 7% capital gains tax on long-term gains over $262,000. This estimator uses 0% — adjust manually if applicable.' },
  { code: 'WY', name: 'Wyoming',       type: 'none' },

  // ── Flat tax states ──────────────────────────────────────────────────────────
  { code: 'AZ', name: 'Arizona',        type: 'flat', flatRate: 0.025  },
  { code: 'CO', name: 'Colorado',       type: 'flat', flatRate: 0.044  },
  { code: 'GA', name: 'Georgia',        type: 'flat', flatRate: 0.0539 },
  { code: 'ID', name: 'Idaho',          type: 'flat', flatRate: 0.058  },
  { code: 'IA', name: 'Iowa',           type: 'flat', flatRate: 0.044  },
  { code: 'IL', name: 'Illinois',       type: 'flat', flatRate: 0.0495 },
  { code: 'IN', name: 'Indiana',        type: 'flat', flatRate: 0.0305 },
  { code: 'KY', name: 'Kentucky',       type: 'flat', flatRate: 0.04   },
  { code: 'LA', name: 'Louisiana',      type: 'flat', flatRate: 0.03   },
  { code: 'MA', name: 'Massachusetts',  type: 'flat', flatRate: 0.05   },
  { code: 'MI', name: 'Michigan',       type: 'flat', flatRate: 0.0425 },
  { code: 'MO', name: 'Missouri',       type: 'flat', flatRate: 0.048  },
  { code: 'NC', name: 'North Carolina', type: 'flat', flatRate: 0.045  },
  { code: 'NE', name: 'Nebraska',       type: 'flat', flatRate: 0.052  },
  { code: 'PA', name: 'Pennsylvania',   type: 'flat', flatRate: 0.0307 },
  { code: 'SC', name: 'South Carolina', type: 'flat', flatRate: 0.062  },
  { code: 'UT', name: 'Utah',           type: 'flat', flatRate: 0.0455 },

  // ── Progressive states ────────────────────────────────────────────────────────
  {
    code: 'AL', name: 'Alabama', type: 'progressive',
    brackets: {
      single: [
        { min: 0,     max: 500,  rate: 0.02 },
        { min: 500,   max: 3000, rate: 0.04 },
        { min: 3000,  max: null, rate: 0.05 },
      ],
      married_jointly: [
        { min: 0,     max: 1000, rate: 0.02 },
        { min: 1000,  max: 6000, rate: 0.04 },
        { min: 6000,  max: null, rate: 0.05 },
      ],
    },
  },
  {
    code: 'AR', name: 'Arkansas', type: 'progressive',
    brackets: {
      single: [
        { min: 0,     max: 4000, rate: 0.02 },
        { min: 4000,  max: 8000, rate: 0.04 },
        { min: 8000,  max: null, rate: 0.047 },
      ],
    },
  },
  {
    code: 'CA', name: 'California', type: 'progressive',
    brackets: {
      single: [
        { min: 0,       max: 10756,  rate: 0.01   },
        { min: 10756,   max: 25499,  rate: 0.02   },
        { min: 25499,   max: 40245,  rate: 0.04   },
        { min: 40245,   max: 55866,  rate: 0.06   },
        { min: 55866,   max: 70606,  rate: 0.08   },
        { min: 70606,   max: 360659, rate: 0.093  },
        { min: 360659,  max: 432787, rate: 0.103  },
        { min: 432787,  max: 721314, rate: 0.113  },
        { min: 721314,  max: 1000000,rate: 0.123  },
        { min: 1000000, max: null,   rate: 0.133  },
      ],
      married_jointly: [
        { min: 0,       max: 21512,  rate: 0.01   },
        { min: 21512,   max: 50998,  rate: 0.02   },
        { min: 50998,   max: 80490,  rate: 0.04   },
        { min: 80490,   max: 111732, rate: 0.06   },
        { min: 111732,  max: 141212, rate: 0.08   },
        { min: 141212,  max: 721318, rate: 0.093  },
        { min: 721318,  max: 865574, rate: 0.103  },
        { min: 865574,  max: 1250738,rate: 0.113  },
        { min: 1250738, max: null,   rate: 0.133  },
      ],
    },
  },
  {
    code: 'CT', name: 'Connecticut', type: 'progressive',
    brackets: {
      single: [
        { min: 0,      max: 10000,  rate: 0.02   },
        { min: 10000,  max: 50000,  rate: 0.045  },
        { min: 50000,  max: 100000, rate: 0.055  },
        { min: 100000, max: 200000, rate: 0.06   },
        { min: 200000, max: 250000, rate: 0.065  },
        { min: 250000, max: 500000, rate: 0.069  },
        { min: 500000, max: null,   rate: 0.0699 },
      ],
      married_jointly: [
        { min: 0,      max: 20000,  rate: 0.02   },
        { min: 20000,  max: 100000, rate: 0.045  },
        { min: 100000, max: 200000, rate: 0.055  },
        { min: 200000, max: 400000, rate: 0.06   },
        { min: 400000, max: 500000, rate: 0.065  },
        { min: 500000, max: 1000000,rate: 0.069  },
        { min: 1000000,max: null,   rate: 0.0699 },
      ],
    },
  },
  {
    code: 'DE', name: 'Delaware', type: 'progressive',
    brackets: {
      single: [
        { min: 0,     max: 2000,  rate: 0.00   },
        { min: 2000,  max: 5000,  rate: 0.022  },
        { min: 5000,  max: 10000, rate: 0.039  },
        { min: 10000, max: 20000, rate: 0.048  },
        { min: 20000, max: 25000, rate: 0.052  },
        { min: 25000, max: 60000, rate: 0.0555 },
        { min: 60000, max: null,  rate: 0.066  },
      ],
    },
  },
  {
    // DC taxes all income including capital gains at ordinary rates
    code: 'DC', name: 'Washington D.C.', type: 'progressive',
    brackets: {
      single: [
        { min: 0,      max: 10000,  rate: 0.04   },
        { min: 10000,  max: 40000,  rate: 0.06   },
        { min: 40000,  max: 60000,  rate: 0.065  },
        { min: 60000,  max: 250000, rate: 0.085  },
        { min: 250000, max: 500000, rate: 0.0925 },
        { min: 500000, max: 1000000,rate: 0.0975 },
        { min: 1000000,max: null,   rate: 0.1075 },
      ],
    },
  },
  {
    code: 'HI', name: 'Hawaii', type: 'progressive',
    brackets: {
      single: [
        { min: 0,      max: 2400,   rate: 0.014  },
        { min: 2400,   max: 4800,   rate: 0.032  },
        { min: 4800,   max: 9600,   rate: 0.055  },
        { min: 9600,   max: 14400,  rate: 0.064  },
        { min: 14400,  max: 19200,  rate: 0.068  },
        { min: 19200,  max: 24000,  rate: 0.072  },
        { min: 24000,  max: 36000,  rate: 0.076  },
        { min: 36000,  max: 48000,  rate: 0.079  },
        { min: 48000,  max: 150000, rate: 0.0825 },
        { min: 150000, max: 175000, rate: 0.09   },
        { min: 175000, max: 200000, rate: 0.10   },
        { min: 200000, max: null,   rate: 0.11   },
      ],
    },
  },
  {
    code: 'KS', name: 'Kansas', type: 'progressive',
    brackets: {
      single: [
        { min: 0,     max: 15000, rate: 0.031  },
        { min: 15000, max: 30000, rate: 0.0525 },
        { min: 30000, max: null,  rate: 0.057  },
      ],
      married_jointly: [
        { min: 0,     max: 30000, rate: 0.031  },
        { min: 30000, max: 60000, rate: 0.0525 },
        { min: 60000, max: null,  rate: 0.057  },
      ],
    },
  },
  {
    code: 'ME', name: 'Maine', type: 'progressive',
    brackets: {
      single: [
        { min: 0,     max: 24500, rate: 0.058  },
        { min: 24500, max: 58050, rate: 0.0675 },
        { min: 58050, max: null,  rate: 0.0715 },
      ],
      married_jointly: [
        { min: 0,     max: 49050, rate: 0.058  },
        { min: 49050, max: 116100,rate: 0.0675 },
        { min: 116100,max: null,  rate: 0.0715 },
      ],
    },
  },
  {
    code: 'MD', name: 'Maryland', type: 'progressive',
    brackets: {
      single: [
        { min: 0,      max: 1000,   rate: 0.02   },
        { min: 1000,   max: 2000,   rate: 0.03   },
        { min: 2000,   max: 3000,   rate: 0.04   },
        { min: 3000,   max: 100000, rate: 0.0475 },
        { min: 100000, max: 125000, rate: 0.05   },
        { min: 125000, max: 150000, rate: 0.0525 },
        { min: 150000, max: 250000, rate: 0.055  },
        { min: 250000, max: null,   rate: 0.0575 },
      ],
      married_jointly: [
        { min: 0,      max: 1000,   rate: 0.02   },
        { min: 1000,   max: 2000,   rate: 0.03   },
        { min: 2000,   max: 3000,   rate: 0.04   },
        { min: 3000,   max: 150000, rate: 0.0475 },
        { min: 150000, max: 175000, rate: 0.05   },
        { min: 175000, max: 225000, rate: 0.0525 },
        { min: 225000, max: 300000, rate: 0.055  },
        { min: 300000, max: null,   rate: 0.0575 },
      ],
    },
  },
  {
    code: 'MN', name: 'Minnesota', type: 'progressive',
    brackets: {
      single: [
        { min: 0,      max: 30070,  rate: 0.0535 },
        { min: 30070,  max: 98760,  rate: 0.068  },
        { min: 98760,  max: 183340, rate: 0.0785 },
        { min: 183340, max: null,   rate: 0.0985 },
      ],
      married_jointly: [
        { min: 0,      max: 43950,  rate: 0.0535 },
        { min: 43950,  max: 174610, rate: 0.068  },
        { min: 174610, max: 304970, rate: 0.0785 },
        { min: 304970, max: null,   rate: 0.0985 },
      ],
    },
  },
  {
    code: 'MS', name: 'Mississippi', type: 'progressive',
    brackets: {
      single: [
        { min: 0,     max: 10000, rate: 0.00  },
        { min: 10000, max: null,  rate: 0.047 },
      ],
    },
  },
  {
    code: 'MT', name: 'Montana', type: 'progressive',
    brackets: {
      single: [
        { min: 0,     max: 18700, rate: 0.047 },
        { min: 18700, max: null,  rate: 0.059 },
      ],
    },
  },
  {
    code: 'NJ', name: 'New Jersey', type: 'progressive',
    brackets: {
      single: [
        { min: 0,      max: 20000,  rate: 0.014   },
        { min: 20000,  max: 35000,  rate: 0.0175  },
        { min: 35000,  max: 40000,  rate: 0.035   },
        { min: 40000,  max: 75000,  rate: 0.05525 },
        { min: 75000,  max: 500000, rate: 0.0637  },
        { min: 500000, max: 1000000,rate: 0.0897  },
        { min: 1000000,max: null,   rate: 0.1075  },
      ],
      married_jointly: [
        { min: 0,      max: 20000,  rate: 0.014   },
        { min: 20000,  max: 50000,  rate: 0.0175  },
        { min: 50000,  max: 70000,  rate: 0.0245  },
        { min: 70000,  max: 80000,  rate: 0.035   },
        { min: 80000,  max: 150000, rate: 0.05525 },
        { min: 150000, max: 500000, rate: 0.0637  },
        { min: 500000, max: 1000000,rate: 0.0897  },
        { min: 1000000,max: null,   rate: 0.1075  },
      ],
    },
  },
  {
    code: 'NM', name: 'New Mexico', type: 'progressive',
    brackets: {
      single: [
        { min: 0,     max: 5500,  rate: 0.017 },
        { min: 5500,  max: 11000, rate: 0.032 },
        { min: 11000, max: 16000, rate: 0.047 },
        { min: 16000, max: null,  rate: 0.059 },
      ],
    },
  },
  {
    code: 'NY', name: 'New York', type: 'progressive',
    brackets: {
      single: [
        { min: 0,       max: 8500,    rate: 0.04   },
        { min: 8500,    max: 11700,   rate: 0.045  },
        { min: 11700,   max: 13900,   rate: 0.0525 },
        { min: 13900,   max: 21400,   rate: 0.0585 },
        { min: 21400,   max: 80650,   rate: 0.0625 },
        { min: 80650,   max: 215400,  rate: 0.0685 },
        { min: 215400,  max: 1077550, rate: 0.0965 },
        { min: 1077550, max: 5000000, rate: 0.103  },
        { min: 5000000, max: null,    rate: 0.109  },
      ],
      married_jointly: [
        { min: 0,       max: 17150,   rate: 0.04   },
        { min: 17150,   max: 23600,   rate: 0.045  },
        { min: 23600,   max: 27900,   rate: 0.0525 },
        { min: 27900,   max: 43000,   rate: 0.0585 },
        { min: 43000,   max: 161550,  rate: 0.0625 },
        { min: 161550,  max: 323200,  rate: 0.0685 },
        { min: 323200,  max: 2155350, rate: 0.0965 },
        { min: 2155350, max: 5000000, rate: 0.103  },
        { min: 5000000, max: null,    rate: 0.109  },
      ],
    },
  },
  {
    code: 'ND', name: 'North Dakota', type: 'progressive',
    brackets: {
      single: [
        { min: 0,     max: 44725, rate: 0.011  },
        { min: 44725, max: null,  rate: 0.0204 },
      ],
    },
  },
  {
    code: 'OH', name: 'Ohio', type: 'progressive',
    brackets: {
      single: [
        { min: 0,      max: 26050,  rate: 0.00    },
        { min: 26050,  max: 100000, rate: 0.02765 },
        { min: 100000, max: 115300, rate: 0.03226 },
        { min: 115300, max: null,   rate: 0.03688 },
      ],
    },
  },
  {
    code: 'OK', name: 'Oklahoma', type: 'progressive',
    brackets: {
      single: [
        { min: 0,    max: 1000, rate: 0.0025 },
        { min: 1000, max: 2500, rate: 0.0075 },
        { min: 2500, max: 3750, rate: 0.0175 },
        { min: 3750, max: 4900, rate: 0.0275 },
        { min: 4900, max: 7200, rate: 0.0375 },
        { min: 7200, max: null, rate: 0.0475 },
      ],
    },
  },
  {
    code: 'OR', name: 'Oregon', type: 'progressive',
    brackets: {
      single: [
        { min: 0,      max: 18400,  rate: 0.0475 },
        { min: 18400,  max: 46200,  rate: 0.0675 },
        { min: 46200,  max: 250000, rate: 0.0875 },
        { min: 250000, max: null,   rate: 0.099  },
      ],
      married_jointly: [
        { min: 0,      max: 36800,  rate: 0.0475 },
        { min: 36800,  max: 92400,  rate: 0.0675 },
        { min: 92400,  max: 250000, rate: 0.0875 },
        { min: 250000, max: null,   rate: 0.099  },
      ],
    },
  },
  {
    code: 'RI', name: 'Rhode Island', type: 'progressive',
    brackets: {
      single: [
        { min: 0,      max: 68200,  rate: 0.0375 },
        { min: 68200,  max: 155050, rate: 0.0475 },
        { min: 155050, max: null,   rate: 0.0599 },
      ],
    },
  },
  {
    code: 'VA', name: 'Virginia', type: 'progressive',
    brackets: {
      single: [
        { min: 0,     max: 3000,  rate: 0.02   },
        { min: 3000,  max: 5000,  rate: 0.03   },
        { min: 5000,  max: 17000, rate: 0.05   },
        { min: 17000, max: null,  rate: 0.0575 },
      ],
    },
  },
  {
    code: 'VT', name: 'Vermont', type: 'progressive',
    brackets: {
      single: [
        { min: 0,      max: 45400,  rate: 0.0335 },
        { min: 45400,  max: 110050, rate: 0.066  },
        { min: 110050, max: 229550, rate: 0.076  },
        { min: 229550, max: null,   rate: 0.0875 },
      ],
      married_jointly: [
        { min: 0,      max: 75850,  rate: 0.0335 },
        { min: 75850,  max: 183400, rate: 0.066  },
        { min: 183400, max: 279450, rate: 0.076  },
        { min: 279450, max: null,   rate: 0.0875 },
      ],
    },
  },
  {
    code: 'WV', name: 'West Virginia', type: 'progressive',
    brackets: {
      single: [
        { min: 0,     max: 10000, rate: 0.0236 },
        { min: 10000, max: 25000, rate: 0.0315 },
        { min: 25000, max: 40000, rate: 0.0354 },
        { min: 40000, max: 60000, rate: 0.0472 },
        { min: 60000, max: null,  rate: 0.0512 },
      ],
    },
  },
  {
    code: 'WI', name: 'Wisconsin', type: 'progressive',
    brackets: {
      single: [
        { min: 0,      max: 14320,  rate: 0.035  },
        { min: 14320,  max: 28640,  rate: 0.044  },
        { min: 28640,  max: 315310, rate: 0.053  },
        { min: 315310, max: null,   rate: 0.0765 },
      ],
      married_jointly: [
        { min: 0,      max: 19090,  rate: 0.035  },
        { min: 19090,  max: 38190,  rate: 0.044  },
        { min: 38190,  max: 420420, rate: 0.053  },
        { min: 420420, max: null,   rate: 0.0765 },
      ],
    },
  },
]

// ─── Lookup helpers ───────────────────────────────────────────────────────────

const STATE_MAP = new Map<string, StateTaxEntry>(
  STATE_TAX_TABLE.map(s => [s.code, s])
)

export function getStateEntry(code: string): StateTaxEntry | undefined {
  return STATE_MAP.get(code.toUpperCase())
}

export function getStateName(code: string): string {
  return STATE_MAP.get(code.toUpperCase())?.name ?? code
}

// Returns brackets for the given filing status, falling back to single
function resolveStateBrackets(entry: StateTaxEntry, status: FilingStatus): TaxBracket[] {
  const brackets = entry.brackets
  if (!brackets) return []

  if (brackets[status]) return brackets[status]!

  // Derive from single: MFS uses single brackets, HOH approximates between single and MFJ
  if (status === 'married_separately') return brackets.single ?? []

  if (status === 'head_of_household') {
    // Use single if MFJ not available, otherwise average the thresholds
    if (!brackets.married_jointly) return brackets.single ?? []
    // For HOH use single brackets (conservative approximation)
    return brackets.single ?? []
  }

  if (status === 'married_jointly') {
    // Double the single thresholds as approximation
    return (brackets.single ?? []).map((b, i, arr) => {
      const prevMax = i === 0 ? 0 : (arr[i - 1].max ?? 0)
      return {
        min: b.min * 2,
        max: b.max !== null ? b.max * 2 : null,
        rate: b.rate,
      }
    })
  }

  return brackets.single ?? []
}

// ─── Main state tax computation ───────────────────────────────────────────────

export interface StateTaxResult {
  stateName: string
  tax: number
  effectiveRate: number
  type: StateTaxType
  notes?: string
}

export function computeStateTax(
  stateCode: string,
  taxableIncome: number,  // combined ordinary + LTCG (most states tax both equally)
  filingStatus: FilingStatus,
): StateTaxResult {
  const entry = getStateEntry(stateCode)

  if (!entry) {
    return {
      stateName: stateCode,
      tax: 0,
      effectiveRate: 0,
      type: 'none',
      notes: 'State not found — enter a manual rate if needed.',
    }
  }

  if (taxableIncome <= 0) {
    return { stateName: entry.name, tax: 0, effectiveRate: 0, type: entry.type, notes: entry.notes }
  }

  let tax = 0

  if (entry.type === 'none') {
    tax = 0
  } else if (entry.type === 'flat') {
    tax = taxableIncome * (entry.flatRate ?? 0)
  } else {
    const brackets = resolveStateBrackets(entry, filingStatus)
    tax = computeProgressiveTax(taxableIncome, brackets)
  }

  const effectiveRate = taxableIncome > 0 ? tax / taxableIncome : 0

  return { stateName: entry.name, tax, effectiveRate, type: entry.type, notes: entry.notes }
}

// All state codes sorted alphabetically for UI dropdowns
export const ALL_STATES = STATE_TAX_TABLE
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(s => ({ code: s.code, name: s.name, type: s.type }))
