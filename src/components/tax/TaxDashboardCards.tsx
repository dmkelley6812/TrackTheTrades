import { DollarSign, TrendingUp, TrendingDown, Percent, Shield, AlertTriangle, CheckCircle, PiggyBank } from 'lucide-react'
import type { TaxCalculationResult } from '../../types'
import { formatCurrency, formatPercent } from '../../lib/utils'

interface Props {
  result: TaxCalculationResult
}

const STATUS_CONFIG = {
  behind:    { label: 'Behind Target',  bg: 'bg-loss/10',   text: 'text-loss',   icon: AlertTriangle,  border: 'border-loss/20'   },
  on_target: { label: 'On Target',      bg: 'bg-accent/10', text: 'text-accent',  icon: CheckCircle,    border: 'border-accent/20'  },
  ahead:     { label: 'Ahead of Target',bg: 'bg-profit/10', text: 'text-profit',  icon: Shield,         border: 'border-profit/20'  },
}

function Card({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  valueColor?: string
}) {
  return (
    <div className="bg-surface border border-border rounded-xl px-4 py-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <div className={`font-bold text-lg tabular-nums leading-tight ${valueColor ?? 'text-text-primary'}`}>
          {value}
        </div>
        <div className="text-text-muted text-xs mt-0.5">{label}</div>
        {sub && <div className="text-text-dim text-[11px] mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

export default function TaxDashboardCards({ result }: Props) {
  const status = STATUS_CONFIG[result.reserveStatus]
  const StatusIcon = status.icon

  const reservePct =
    result.requiredReserveBalance > 0
      ? (result.actualSavingsBalance / result.requiredReserveBalance) * 100
      : 0

  return (
    <div className="space-y-4">
      {/* Reserve status banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${status.bg} ${status.border}`}>
        <StatusIcon className={`w-5 h-5 ${status.text} flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <span className={`font-semibold text-sm ${status.text}`}>{status.label}</span>
          {result.reserveDifference !== 0 && (
            <span className="text-text-muted text-sm ml-2">
              {result.reserveDifference > 0 ? '+' : ''}
              {formatCurrency(result.reserveDifference)} vs required reserve
            </span>
          )}
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.text} border ${status.border} whitespace-nowrap`}>
          {reservePct.toFixed(0)}% funded
        </span>
      </div>

      {/* 8-card grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          label="Total Tax Liability"
          value={formatCurrency(result.totalLiability)}
          sub={`After ${formatCurrency(result.taxPaymentsMade)} paid`}
          icon={DollarSign}
          iconBg="bg-loss/10"
          iconColor="text-loss"
          valueColor={result.totalLiability > 0 ? 'text-loss' : 'text-text-primary'}
        />
        <Card
          label="Required Reserve Balance"
          value={formatCurrency(result.requiredReserveBalance)}
          sub={`${(result.reserveMultiplier * 100).toFixed(0)}% of remaining liability`}
          icon={Shield}
          iconBg="bg-accent/10"
          iconColor="text-accent"
        />
        <Card
          label="Tax Savings Balance"
          value={formatCurrency(result.actualSavingsBalance)}
          sub="Your current reserve account"
          icon={PiggyBank}
          iconBg={result.actualSavingsBalance >= result.requiredReserveBalance ? 'bg-profit/10' : 'bg-hover'}
          iconColor={result.actualSavingsBalance >= result.requiredReserveBalance ? 'text-profit' : 'text-text-muted'}
          valueColor={result.actualSavingsBalance >= result.requiredReserveBalance ? 'text-profit' : undefined}
        />
        <Card
          label={result.reserveDifference >= 0 ? 'Reserve Surplus' : 'Reserve Shortfall'}
          value={formatCurrency(Math.abs(result.reserveDifference))}
          sub={result.reserveDifference >= 0 ? 'Ahead of target' : 'Need to add more'}
          icon={result.reserveDifference >= 0 ? TrendingUp : TrendingDown}
          iconBg={result.reserveDifference >= 0 ? 'bg-profit/10' : 'bg-loss/10'}
          iconColor={result.reserveDifference >= 0 ? 'text-profit' : 'text-loss'}
          valueColor={result.reserveDifference >= 0 ? 'text-profit' : 'text-loss'}
        />
        <Card
          label="Federal Tax Estimate"
          value={formatCurrency(result.totalFederalTax)}
          sub={`Ordinary + LTCG + NIIT`}
          icon={DollarSign}
          iconBg="bg-hover"
          iconColor="text-text-muted"
        />
        <Card
          label="State Tax Estimate"
          value={formatCurrency(result.stateTax)}
          sub={result.stateName}
          icon={DollarSign}
          iconBg="bg-hover"
          iconColor="text-text-muted"
        />
        <Card
          label="Effective Tax Rate"
          value={formatPercent(result.effectiveTaxRate * 100)}
          sub={`Total / AGI`}
          icon={Percent}
          iconBg="bg-hover"
          iconColor="text-text-muted"
        />
        <Card
          label="Marginal Federal Rate"
          value={formatPercent(result.marginalFederalRate * 100)}
          sub="On next dollar of ordinary income"
          icon={TrendingUp}
          iconBg="bg-hover"
          iconColor="text-text-muted"
        />
      </div>
    </div>
  )
}
