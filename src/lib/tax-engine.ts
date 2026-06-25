import type {
  TaxEngineInput,
  TaxCalculationResult,
  TaxIncomeBreakdown,
  AssetClassIncome,
  TaxReserveStatus,
} from '../types'
import {
  FEDERAL_ORDINARY_BRACKETS,
  FEDERAL_LTCG_BRACKETS,
  NIIT_RATE,
  computeProgressiveTax,
  computeStackedLTCGTax,
  getMarginalRate,
  getBracketsForYear,
  getStandardDeduction,
  getNiitThreshold,
  computeChildTaxCredit,
} from './tax-brackets'
import { computeStateTax } from './state-tax'

// ─── Reserve mode multipliers ─────────────────────────────────────────────────

const RESERVE_MULTIPLIERS: Record<string, number> = {
  minimum:      0.90,
  recommended:  1.00,
  conservative: 1.15,
}

// ─── Section 1256 (Futures) split ─────────────────────────────────────────────
// 60% of net futures gain treated as long-term capital gain
// 40% of net futures gain treated as short-term (ordinary income rates)
const FUTURES_LTCG_RATIO    = 0.60
const FUTURES_ORDINARY_RATIO = 0.40

// ─── Core engine ─────────────────────────────────────────────────────────────

export function computeTaxEstimate(input: TaxEngineInput): TaxCalculationResult {
  const {
    taxYear,
    filingStatus,
    state,
    w2Income,
    otherOrdinaryIncome,
    deductionMethod,
    itemizedDeductionAmount,
    reserveMode,
    taxPaymentsMade,
    taxSavingsBalance,
    qualifyingChildren,
    otherDependents,
    assetIncome,
  } = input

  // ── 1. Asset class income allocation ────────────────────────────────────────

  // Futures: Section 1256 — 60/40 split on net gain/loss
  const futuresNet = assetIncome.futures
  const futuresOrdinary = futuresNet * FUTURES_ORDINARY_RATIO
  const futuresLTCG     = futuresNet * FUTURES_LTCG_RATIO

  // All other asset classes: ordinary income (short-term treatment by default)
  // Forex is always ordinary income
  const tradingOrdinaryIncome =
    futuresOrdinary +
    assetIncome.stocks +
    assetIncome.options +
    assetIncome.crypto +
    assetIncome.forex

  const tradingLTCG = futuresLTCG

  // ── 2. Total income before deductions ───────────────────────────────────────

  const totalPreDeductionOrdinary = w2Income + otherOrdinaryIncome + tradingOrdinaryIncome
  const totalPreDeductionLTCG     = tradingLTCG

  // ── 3. Deduction ─────────────────────────────────────────────────────────────

  const standardDeduction = getStandardDeduction(taxYear, filingStatus)
  const deduction =
    deductionMethod === 'itemized'
      ? Math.max(itemizedDeductionAmount, 0)
      : standardDeduction

  // Deduction applied against ordinary income only
  const taxableOrdinaryIncome = Math.max(0, totalPreDeductionOrdinary - deduction)
  const taxableLTCG            = Math.max(0, totalPreDeductionLTCG)

  const adjustedGrossIncome = totalPreDeductionOrdinary + totalPreDeductionLTCG

  const income: TaxIncomeBreakdown = {
    w2Income,
    otherOrdinaryIncome,
    tradingOrdinaryIncome,
    tradingLTCG,
    totalPreDeductionIncome: totalPreDeductionOrdinary + totalPreDeductionLTCG,
    deduction,
    taxableOrdinaryIncome,
    taxableLTCG,
    adjustedGrossIncome,
  }

  // ── 4. Federal ordinary income tax ──────────────────────────────────────────

  const ordinaryBrackets = getBracketsForYear(FEDERAL_ORDINARY_BRACKETS, taxYear, filingStatus)
  const federalOrdinaryTax = computeProgressiveTax(taxableOrdinaryIncome, ordinaryBrackets)
  const marginalFederalRate = getMarginalRate(taxableOrdinaryIncome, ordinaryBrackets)

  // ── 5. Federal long-term capital gains tax ───────────────────────────────────

  const ltcgBrackets = getBracketsForYear(FEDERAL_LTCG_BRACKETS, taxYear, filingStatus)
  const federalLTCGTax = computeStackedLTCGTax(taxableOrdinaryIncome, taxableLTCG, ltcgBrackets)

  // ── 6. Net Investment Income Tax (NIIT) ──────────────────────────────────────

  // NIIT applies to the lesser of: net investment income, or MAGI - threshold
  // For traders, net investment income = trading gains (ordinary + LTCG)
  const netInvestmentIncome = Math.max(0, tradingOrdinaryIncome + tradingLTCG)
  const niitThreshold = getNiitThreshold(taxYear, filingStatus)
  const niitExposure = Math.max(0, adjustedGrossIncome - niitThreshold)
  const niitBase = Math.min(netInvestmentIncome, niitExposure)
  const niitTax = niitBase * NIIT_RATE

  // ── 7. Total federal tax before credits ──────────────────────────────────────

  const totalFederalTaxBeforeCredits = federalOrdinaryTax + federalLTCGTax + niitTax

  // ── 7a. Child Tax Credit (directly reduces federal tax) ───────────────────────

  const ctc = computeChildTaxCredit({
    qualifyingChildren,
    otherDependents,
    adjustedGrossIncome,
    filingStatus,
    federalTaxBeforeCredits: totalFederalTaxBeforeCredits,
    year: taxYear,
  })

  const totalCredits     = ctc.netCredit
  const totalFederalTax  = Math.max(0, totalFederalTaxBeforeCredits - totalCredits)

  // ── 8. State tax ─────────────────────────────────────────────────────────────

  // Most states tax all income (ordinary + LTCG) at ordinary state rates.
  // State taxable = total federal AGI minus the same deduction used federally.
  const stateTaxableIncome = Math.max(0, adjustedGrossIncome - deduction)
  const stateResult = computeStateTax(state, stateTaxableIncome, filingStatus)

  // ── 9. Total liability & reserve ─────────────────────────────────────────────

  const totalLiability = totalFederalTax + stateResult.tax

  const reserveMultiplier = RESERVE_MULTIPLIERS[reserveMode] ?? 1.0
  const requiredReserveBalance = Math.max(0, totalLiability - taxPaymentsMade) * reserveMultiplier

  const netLiabilityAfterPayments = Math.max(0, totalLiability - taxPaymentsMade)

  // ── 10. Reserve status ───────────────────────────────────────────────────────

  const reserveDifference = taxSavingsBalance - requiredReserveBalance
  let reserveStatus: TaxReserveStatus
  if (reserveDifference >= -50) {
    reserveStatus = reserveDifference >= 50 ? 'ahead' : 'on_target'
  } else {
    reserveStatus = 'behind'
  }

  // ── 11. Effective tax rate ────────────────────────────────────────────────────

  const effectiveTaxRate =
    adjustedGrossIncome > 0 ? totalLiability / adjustedGrossIncome : 0

  return {
    income,
    assetIncome,
    federalOrdinaryTax,
    federalLTCGTax,
    niitTax,
    totalFederalTaxBeforeCredits,
    childTaxCreditGross:    ctc.grossCredit,
    childTaxCreditPhaseOut: ctc.phaseOutReduction,
    childTaxCreditNet:      ctc.netCredit,
    totalCredits,
    totalFederalTax,
    stateTax: stateResult.tax,
    stateName: stateResult.stateName,
    stateEffectiveRate: stateResult.effectiveRate,
    totalLiability,
    reserveMultiplier,
    requiredReserveBalance,
    actualSavingsBalance: taxSavingsBalance,
    taxPaymentsMade,
    netLiabilityAfterPayments,
    reserveStatus,
    reserveDifference,
    effectiveTaxRate,
    marginalFederalRate,
    taxYear,
  }
}

// ─── Asset class auto-detection from trades ───────────────────────────────────

import type { DbTrade, DbAccount } from '../types'

// Groups YTD trades by account, maps to asset class based on account.product_type.
// Only counts trades from live accounts — paper and demo P&L is not taxable.
// Trades with no account_id (pre-migration legacy data) are included as-is.
export function computeAssetClassIncomeFromTrades(
  ytdTrades: DbTrade[],
  accounts: DbAccount[],
): AssetClassIncome {
  const accountMap = new Map<string, DbAccount>(accounts.map(a => [a.id, a]))

  const result: AssetClassIncome = {
    futures: 0,
    stocks:  0,
    options: 0,
    crypto:  0,
    forex:   0,
  }

  for (const trade of ytdTrades) {
    const account = trade.account_id ? accountMap.get(trade.account_id) : null

    // Skip paper and demo account trades — only live account P&L is taxable.
    // Trades with no account_id are legacy data and included by default.
    if (account && account.account_type !== 'live') continue

    const productType = account?.product_type ?? 'futures'
    const key = productType === 'mixed' ? 'futures' : productType
    if (key === 'futures' || key === 'stocks' || key === 'options' || key === 'crypto' || key === 'forex') {
      result[key] += trade.net_pnl
    } else {
      result.futures += trade.net_pnl
    }
  }

  return result
}

// Applies manual overrides from the tax profile onto the auto-computed values.
// A non-null override replaces the auto value for that asset class.
export function applyProfileOverrides(
  auto: AssetClassIncome,
  overrides: {
    futures_profit_override: number | null
    stocks_profit_override: number | null
    options_profit_override: number | null
    crypto_profit_override: number | null
    forex_profit_override: number | null
  },
): AssetClassIncome {
  return {
    futures: overrides.futures_profit_override ?? auto.futures,
    stocks:  overrides.stocks_profit_override  ?? auto.stocks,
    options: overrides.options_profit_override ?? auto.options,
    crypto:  overrides.crypto_profit_override  ?? auto.crypto,
    forex:   overrides.forex_profit_override   ?? auto.forex,
  }
}
