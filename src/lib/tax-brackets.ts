import type { FilingStatus, TaxBracket } from '../types'

// ─── Federal Ordinary Income Brackets ────────────────────────────────────────

type BracketsByStatus = Record<FilingStatus, TaxBracket[]>
type BracketsByYear = Record<number, BracketsByStatus>

export const FEDERAL_ORDINARY_BRACKETS: BracketsByYear = {
  2025: {
    single: [
      { min: 0,       max: 11925,  rate: 0.10 },
      { min: 11925,   max: 48475,  rate: 0.12 },
      { min: 48475,   max: 103350, rate: 0.22 },
      { min: 103350,  max: 197300, rate: 0.24 },
      { min: 197300,  max: 250525, rate: 0.32 },
      { min: 250525,  max: 626350, rate: 0.35 },
      { min: 626350,  max: null,   rate: 0.37 },
    ],
    married_jointly: [
      { min: 0,       max: 23850,  rate: 0.10 },
      { min: 23850,   max: 96950,  rate: 0.12 },
      { min: 96950,   max: 206700, rate: 0.22 },
      { min: 206700,  max: 394600, rate: 0.24 },
      { min: 394600,  max: 501050, rate: 0.32 },
      { min: 501050,  max: 751600, rate: 0.35 },
      { min: 751600,  max: null,   rate: 0.37 },
    ],
    married_separately: [
      { min: 0,       max: 11925,  rate: 0.10 },
      { min: 11925,   max: 48475,  rate: 0.12 },
      { min: 48475,   max: 103350, rate: 0.22 },
      { min: 103350,  max: 197300, rate: 0.24 },
      { min: 197300,  max: 250525, rate: 0.32 },
      { min: 250525,  max: 375800, rate: 0.35 },
      { min: 375800,  max: null,   rate: 0.37 },
    ],
    head_of_household: [
      { min: 0,       max: 17000,  rate: 0.10 },
      { min: 17000,   max: 64850,  rate: 0.12 },
      { min: 64850,   max: 103350, rate: 0.22 },
      { min: 103350,  max: 197300, rate: 0.24 },
      { min: 197300,  max: 250500, rate: 0.32 },
      { min: 250500,  max: 626350, rate: 0.35 },
      { min: 626350,  max: null,   rate: 0.37 },
    ],
  },
  2024: {
    single: [
      { min: 0,       max: 11600,  rate: 0.10 },
      { min: 11600,   max: 47150,  rate: 0.12 },
      { min: 47150,   max: 100525, rate: 0.22 },
      { min: 100525,  max: 191950, rate: 0.24 },
      { min: 191950,  max: 243725, rate: 0.32 },
      { min: 243725,  max: 609350, rate: 0.35 },
      { min: 609350,  max: null,   rate: 0.37 },
    ],
    married_jointly: [
      { min: 0,       max: 23200,  rate: 0.10 },
      { min: 23200,   max: 94300,  rate: 0.12 },
      { min: 94300,   max: 201050, rate: 0.22 },
      { min: 201050,  max: 383900, rate: 0.24 },
      { min: 383900,  max: 487450, rate: 0.32 },
      { min: 487450,  max: 731200, rate: 0.35 },
      { min: 731200,  max: null,   rate: 0.37 },
    ],
    married_separately: [
      { min: 0,       max: 11600,  rate: 0.10 },
      { min: 11600,   max: 47150,  rate: 0.12 },
      { min: 47150,   max: 100525, rate: 0.22 },
      { min: 100525,  max: 191950, rate: 0.24 },
      { min: 191950,  max: 243725, rate: 0.32 },
      { min: 243725,  max: 365600, rate: 0.35 },
      { min: 365600,  max: null,   rate: 0.37 },
    ],
    head_of_household: [
      { min: 0,       max: 16550,  rate: 0.10 },
      { min: 16550,   max: 63100,  rate: 0.12 },
      { min: 63100,   max: 100500, rate: 0.22 },
      { min: 100500,  max: 191950, rate: 0.24 },
      { min: 191950,  max: 243700, rate: 0.32 },
      { min: 243700,  max: 609350, rate: 0.35 },
      { min: 609350,  max: null,   rate: 0.37 },
    ],
  },
}

// ─── Long-Term Capital Gains Brackets ─────────────────────────────────────────

export const FEDERAL_LTCG_BRACKETS: BracketsByYear = {
  2025: {
    single: [
      { min: 0,      max: 47025,  rate: 0.00 },
      { min: 47025,  max: 518900, rate: 0.15 },
      { min: 518900, max: null,   rate: 0.20 },
    ],
    married_jointly: [
      { min: 0,      max: 94050,  rate: 0.00 },
      { min: 94050,  max: 583750, rate: 0.15 },
      { min: 583750, max: null,   rate: 0.20 },
    ],
    married_separately: [
      { min: 0,      max: 47025,  rate: 0.00 },
      { min: 47025,  max: 291850, rate: 0.15 },
      { min: 291850, max: null,   rate: 0.20 },
    ],
    head_of_household: [
      { min: 0,      max: 63000,  rate: 0.00 },
      { min: 63000,  max: 551350, rate: 0.15 },
      { min: 551350, max: null,   rate: 0.20 },
    ],
  },
  2024: {
    single: [
      { min: 0,      max: 47025,  rate: 0.00 },
      { min: 47025,  max: 518900, rate: 0.15 },
      { min: 518900, max: null,   rate: 0.20 },
    ],
    married_jointly: [
      { min: 0,      max: 94050,  rate: 0.00 },
      { min: 94050,  max: 583750, rate: 0.15 },
      { min: 583750, max: null,   rate: 0.20 },
    ],
    married_separately: [
      { min: 0,      max: 47025,  rate: 0.00 },
      { min: 47025,  max: 291875, rate: 0.15 },
      { min: 291875, max: null,   rate: 0.20 },
    ],
    head_of_household: [
      { min: 0,      max: 63000,  rate: 0.00 },
      { min: 63000,  max: 551350, rate: 0.15 },
      { min: 551350, max: null,   rate: 0.20 },
    ],
  },
}

// ─── Standard Deductions ──────────────────────────────────────────────────────

type DeductionsByStatus = Record<FilingStatus, number>
type DeductionsByYear = Record<number, DeductionsByStatus>

export const STANDARD_DEDUCTIONS: DeductionsByYear = {
  2025: {
    single:              15000,
    married_jointly:     30000,
    married_separately:  15000,
    head_of_household:   22500,
  },
  2024: {
    single:              14600,
    married_jointly:     29200,
    married_separately:  14600,
    head_of_household:   21900,
  },
}

// ─── NIIT Thresholds (Net Investment Income Tax — 3.8%) ───────────────────────

type ThresholdsByStatus = Record<FilingStatus, number>
type ThresholdsByYear = Record<number, ThresholdsByStatus>

export const NIIT_THRESHOLDS: ThresholdsByYear = {
  2025: {
    single:              200000,
    married_jointly:     250000,
    married_separately:  125000,
    head_of_household:   200000,
  },
  2024: {
    single:              200000,
    married_jointly:     250000,
    married_separately:  125000,
    head_of_household:   200000,
  },
}

export const NIIT_RATE = 0.038

// ─── Child Tax Credit ─────────────────────────────────────────────────────────

export const CHILD_TAX_CREDIT_PER_CHILD = 2000         // per qualifying child under 17
export const OTHER_DEPENDENT_CREDIT     = 500          // per non-child qualifying dependent

// Phase-out: $50 reduction per $1,000 (or fraction) of AGI above threshold
export const CTC_PHASE_OUT_RATE        = 50            // dollars per $1,000 of excess AGI
export const CTC_PHASE_OUT_INTERVAL    = 1000

type CtcThresholdsByStatus = Record<FilingStatus, number>
type CtcThresholdsByYear   = Record<number, CtcThresholdsByStatus>

export const CTC_PHASE_OUT_THRESHOLDS: CtcThresholdsByYear = {
  2025: {
    single:              200000,
    married_jointly:     400000,
    married_separately:  200000,
    head_of_household:   200000,
  },
  2024: {
    single:              200000,
    married_jointly:     400000,
    married_separately:  200000,
    head_of_household:   200000,
  },
}

export function getCtcPhaseOutThreshold(year: number, status: FilingStatus): number {
  const years = Object.keys(CTC_PHASE_OUT_THRESHOLDS)
    .map(Number)
    .filter(y => y <= year)
    .sort((a, b) => b - a)
  const resolvedYear = years[0] ?? Math.min(...Object.keys(CTC_PHASE_OUT_THRESHOLDS).map(Number))
  return CTC_PHASE_OUT_THRESHOLDS[resolvedYear][status]
}

// Returns the CTC after phase-out, capped at actual federal tax (non-refundable treatment).
// gross = children * 2000 + dependents * 500, then reduced by phase-out.
export function computeChildTaxCredit(params: {
  qualifyingChildren: number
  otherDependents: number
  adjustedGrossIncome: number
  filingStatus: FilingStatus
  federalTaxBeforeCredits: number
  year: number
}): { grossCredit: number; phaseOutReduction: number; netCredit: number } {
  const { qualifyingChildren, otherDependents, adjustedGrossIncome, filingStatus, federalTaxBeforeCredits, year } = params

  const grossCredit =
    qualifyingChildren * CHILD_TAX_CREDIT_PER_CHILD +
    otherDependents    * OTHER_DEPENDENT_CREDIT

  if (grossCredit === 0) return { grossCredit: 0, phaseOutReduction: 0, netCredit: 0 }

  const threshold = getCtcPhaseOutThreshold(year, filingStatus)
  const excessAGI  = Math.max(0, adjustedGrossIncome - threshold)
  // Phase-out: $50 per $1,000 or fraction thereof
  const intervals  = Math.ceil(excessAGI / CTC_PHASE_OUT_INTERVAL)
  const phaseOutReduction = intervals * CTC_PHASE_OUT_RATE

  const creditAfterPhaseOut = Math.max(0, grossCredit - phaseOutReduction)

  // CTC is non-refundable in this estimator — cannot reduce federal tax below zero
  const netCredit = Math.min(creditAfterPhaseOut, Math.max(0, federalTaxBeforeCredits))

  return { grossCredit, phaseOutReduction, netCredit }
}

// ─── Progressive tax computation ──────────────────────────────────────────────

export function computeProgressiveTax(income: number, brackets: TaxBracket[]): number {
  if (income <= 0) return 0
  let tax = 0
  for (const bracket of brackets) {
    if (income <= bracket.min) break
    const upper = bracket.max ?? Infinity
    const taxable = Math.min(income, upper) - bracket.min
    tax += taxable * bracket.rate
  }
  return tax
}

// LTCG tax using the "stacking" method: LTCG is layered on top of ordinary income
export function computeStackedLTCGTax(
  taxableOrdinaryIncome: number,
  taxableLTCG: number,
  ltcgBrackets: TaxBracket[],
): number {
  if (taxableLTCG <= 0) return 0
  const totalIncome = taxableOrdinaryIncome + taxableLTCG
  const taxOnTotal = computeProgressiveTax(totalIncome, ltcgBrackets)
  const taxOnOrdinary = computeProgressiveTax(taxableOrdinaryIncome, ltcgBrackets)
  return Math.max(0, taxOnTotal - taxOnOrdinary)
}

// Returns marginal rate at a given income level
export function getMarginalRate(income: number, brackets: TaxBracket[]): number {
  if (income <= 0) return brackets[0]?.rate ?? 0
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (income > brackets[i].min) return brackets[i].rate
  }
  return brackets[0]?.rate ?? 0
}

// Resolves brackets to the best available year at or below the requested year
export function getBracketsForYear(
  table: BracketsByYear,
  year: number,
  status: FilingStatus,
): TaxBracket[] {
  const years = Object.keys(table)
    .map(Number)
    .filter(y => y <= year)
    .sort((a, b) => b - a)
  const resolvedYear = years[0] ?? Math.min(...Object.keys(table).map(Number))
  return table[resolvedYear][status]
}

export function getStandardDeduction(year: number, status: FilingStatus): number {
  const years = Object.keys(STANDARD_DEDUCTIONS)
    .map(Number)
    .filter(y => y <= year)
    .sort((a, b) => b - a)
  const resolvedYear = years[0] ?? Math.min(...Object.keys(STANDARD_DEDUCTIONS).map(Number))
  return STANDARD_DEDUCTIONS[resolvedYear][status]
}

export function getNiitThreshold(year: number, status: FilingStatus): number {
  const years = Object.keys(NIIT_THRESHOLDS)
    .map(Number)
    .filter(y => y <= year)
    .sort((a, b) => b - a)
  const resolvedYear = years[0] ?? Math.min(...Object.keys(NIIT_THRESHOLDS).map(Number))
  return NIIT_THRESHOLDS[resolvedYear][status]
}
