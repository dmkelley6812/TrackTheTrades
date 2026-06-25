import type { TaxCalculationResult } from '../../types'
import { formatCurrency, formatPercent } from '../../lib/utils'

interface Props {
  result: TaxCalculationResult
}

function Row({
  label,
  value,
  indent = false,
  bold = false,
  valueColor,
  divider = false,
}: {
  label: string
  value: string
  indent?: boolean
  bold?: boolean
  valueColor?: string
  divider?: boolean
}) {
  return (
    <>
      {divider && <tr><td colSpan={2} className="py-0.5"><div className="border-t border-border" /></td></tr>}
      <tr className="hover:bg-hover/50 transition-colors">
        <td className={`py-2 px-4 text-sm ${indent ? 'pl-8 text-text-muted' : bold ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
          {label}
        </td>
        <td className={`py-2 px-4 text-sm text-right tabular-nums ${bold ? 'font-semibold' : ''} ${valueColor ?? (bold ? 'text-text-primary' : 'text-text-muted')}`}>
          {value}
        </td>
      </tr>
    </>
  )
}

export default function TaxBreakdownTable({ result }: Props) {
  const { income, assetIncome } = result
  const totalTradingProfit =
    assetIncome.futures + assetIncome.stocks + assetIncome.options + assetIncome.crypto + assetIncome.forex

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-text-primary font-semibold text-sm">Tax Calculation Breakdown</h3>
        <p className="text-text-muted text-xs mt-0.5">Tax year {result.taxYear} · Federal + State estimate</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {/* Income section */}
            <Row label="Income" value="" bold />
            <Row label="W-2 / Salary Income" value={formatCurrency(income.w2Income)} indent />
            <Row label="Other Ordinary Income" value={formatCurrency(income.otherOrdinaryIncome)} indent />

            {/* Trading income breakdown */}
            {assetIncome.futures !== 0 && (
              <>
                <Row label={`Futures (Section 1256) — total ${formatCurrency(assetIncome.futures)}`} value="" indent />
                <Row label="  40% ordinary income" value={formatCurrency(income.tradingOrdinaryIncome - (assetIncome.stocks + assetIncome.options + assetIncome.crypto + assetIncome.forex))} indent />
                <Row label="  60% long-term cap gain" value={formatCurrency(income.tradingLTCG)} indent />
              </>
            )}
            {assetIncome.stocks  !== 0 && <Row label="Stocks P&L (short-term)" value={formatCurrency(assetIncome.stocks)}  indent />}
            {assetIncome.options !== 0 && <Row label="Options P&L (short-term)"value={formatCurrency(assetIncome.options)} indent />}
            {assetIncome.crypto  !== 0 && <Row label="Crypto P&L (short-term)" value={formatCurrency(assetIncome.crypto)}  indent />}
            {assetIncome.forex   !== 0 && <Row label="Forex P&L (ordinary)"    value={formatCurrency(assetIncome.forex)}   indent />}

            <Row label="Trading Ordinary Income" value={formatCurrency(income.tradingOrdinaryIncome)} indent bold={false} />
            <Row
              label="Total Pre-Deduction Income"
              value={formatCurrency(income.totalPreDeductionIncome)}
              bold
              divider
            />

            {/* Deductions */}
            <Row label="Deductions" value="" bold />
            <Row label={income.deduction === income.w2Income ? 'Standard Deduction' : 'Itemized Deduction'} value={`(${formatCurrency(income.deduction)})`} indent />
            <Row label="Adjusted Gross Income (AGI)" value={formatCurrency(income.adjustedGrossIncome)} bold divider />

            {/* Taxable income */}
            <Row label="Taxable Income" value="" bold />
            <Row label="Taxable Ordinary Income" value={formatCurrency(income.taxableOrdinaryIncome)} indent />
            <Row label="Taxable Long-Term Capital Gains" value={formatCurrency(income.taxableLTCG)} indent />

            {/* Federal taxes */}
            <Row label="Federal Tax" value="" bold divider />
            <Row label="Ordinary Income Tax" value={formatCurrency(result.federalOrdinaryTax)} indent />
            <Row label={`LTCG Tax (stacked)`}   value={formatCurrency(result.federalLTCGTax)}  indent />
            {result.niitTax > 0 && (
              <Row label="Net Investment Income Tax (3.8%)" value={formatCurrency(result.niitTax)} indent />
            )}
            <Row label="Federal Tax (before credits)" value={formatCurrency(result.totalFederalTaxBeforeCredits)} bold />

            {/* Tax credits */}
            {result.totalCredits > 0 && (
              <>
                <Row label="Tax Credits" value="" bold divider />
                {result.childTaxCreditGross > 0 && (
                  <>
                    <Row label="Child Tax Credit (gross)" value={`(${formatCurrency(result.childTaxCreditGross)})`} indent />
                    {result.childTaxCreditPhaseOut > 0 && (
                      <Row label="Phase-out (AGI too high)" value={`+${formatCurrency(result.childTaxCreditPhaseOut)}`} indent />
                    )}
                    <Row label="Child Tax Credit (applied)" value={`(${formatCurrency(result.childTaxCreditNet)})`} indent valueColor="text-profit" />
                  </>
                )}
                <Row label="Total Federal Tax (after credits)" value={formatCurrency(result.totalFederalTax)} bold valueColor="text-text-primary" />
              </>
            )}
            {result.totalCredits === 0 && (
              <Row label="Total Federal Tax" value={formatCurrency(result.totalFederalTax)} bold />
            )}

            {/* State tax */}
            <Row label={`${result.stateName} State Tax`} value={formatCurrency(result.stateTax)} divider
              bold={false}
            />

            {/* Summary */}
            <Row
              label="Total Estimated Liability"
              value={formatCurrency(result.totalLiability)}
              bold
              divider
              valueColor="text-loss"
            />
            <Row label="Tax Payments Already Made" value={`(${formatCurrency(result.taxPaymentsMade)})`} indent />
            <Row
              label="Remaining Liability"
              value={formatCurrency(result.netLiabilityAfterPayments)}
              bold
              valueColor="text-loss"
            />

            {/* Reserve */}
            <Row label="Reserve Calculation" value="" bold divider />
            <Row
              label={`Reserve Mode: ${result.reserveMultiplier * 100}% of remaining liability`}
              value={formatCurrency(result.requiredReserveBalance)}
              indent
            />
            <Row label="Actual Tax Savings Balance" value={formatCurrency(result.actualSavingsBalance)} indent />
            <Row
              label={result.reserveDifference >= 0 ? 'Surplus (ahead of target)' : 'Shortfall (behind target)'}
              value={`${result.reserveDifference >= 0 ? '+' : ''}${formatCurrency(result.reserveDifference)}`}
              bold
              divider
              valueColor={result.reserveDifference >= 0 ? 'text-profit' : 'text-loss'}
            />

            {/* Rates */}
            <Row label="Effective Tax Rate" value={formatPercent(result.effectiveTaxRate * 100)} divider />
            <Row label="Marginal Federal Rate"value={formatPercent(result.marginalFederalRate * 100)} />
            {result.stateEffectiveRate > 0 && (
              <Row label={`Effective ${result.stateName} Rate`} value={formatPercent(result.stateEffectiveRate * 100)} />
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
