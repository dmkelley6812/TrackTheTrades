import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts'
import type { TaxCalculationResult } from '../../types'
import { formatCurrency } from '../../lib/utils'

interface Props {
  result: TaxCalculationResult
}

const CHART_COLORS = {
  federal:  '#4a7cf4',
  state:    '#a78bfa',
  reserve:  '#22d984',
  shortfall:'#f14b4b',
  ltcg:     '#34d399',
  niit:     '#f59e0b',
  savings:  '#22d984',
  required: '#4a7cf4',
}

function TooltipStyle({ active, payload, label }: { active?: boolean; payload?: {name: string; value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-base border border-border rounded-lg px-3 py-2 shadow-card text-xs">
      {label && <p className="text-text-muted mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="text-text-primary">
          <span className="text-text-muted">{p.name}: </span>
          {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

// ─── Income vs Tax breakdown bar chart ────────────────────────────────────────

function IncomeTaxChart({ result }: Props) {
  const { income } = result

  const data = [
    {
      name: 'W-2 & Other',
      value: income.w2Income + income.otherOrdinaryIncome,
    },
    {
      name: 'Trading (Ordinary)',
      value: Math.max(0, income.tradingOrdinaryIncome),
    },
    {
      name: 'Trading (LTCG)',
      value: Math.max(0, income.tradingLTCG),
    },
  ].filter(d => d.value > 0)

  const taxData = [
    { name: 'Federal Ordinary',  value: result.federalOrdinaryTax },
    { name: 'Federal LTCG',      value: result.federalLTCGTax },
    { name: 'NIIT',              value: result.niitTax },
    { name: 'State Tax',         value: result.stateTax },
  ].filter(d => d.value > 0)

  const INCOME_COLORS = ['#4a7cf4', '#22d984', '#34d399']
  const TAX_COLORS    = ['#f14b4b', '#f87171', '#f59e0b', '#a78bfa']

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Income breakdown */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h4 className="text-text-primary text-sm font-semibold mb-4">Income Breakdown</h4>
        {data.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">No income data</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={INCOME_COLORS[i % INCOME_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<TooltipStyle />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: '#6b7194' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tax breakdown */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <h4 className="text-text-primary text-sm font-semibold mb-4">Tax Breakdown</h4>
        {taxData.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">No tax liability</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={taxData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={2}
              >
                {taxData.map((_, i) => (
                  <Cell key={i} fill={TAX_COLORS[i % TAX_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<TooltipStyle />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: '#6b7194' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

// ─── Reserve vs Liability comparison bar chart ────────────────────────────────

function ReserveComparisonChart({ result }: Props) {
  const data = [
    {
      label: 'Total Liability',
      value: result.totalLiability,
      fill: CHART_COLORS.shortfall,
    },
    {
      label: 'After Payments',
      value: result.netLiabilityAfterPayments,
      fill: '#f87171',
    },
    {
      label: 'Required Reserve',
      value: result.requiredReserveBalance,
      fill: CHART_COLORS.required,
    },
    {
      label: 'Actual Savings',
      value: result.actualSavingsBalance,
      fill: result.actualSavingsBalance >= result.requiredReserveBalance
        ? CHART_COLORS.savings
        : '#f59e0b',
    },
  ]

  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <h4 className="text-text-primary text-sm font-semibold mb-1">Reserve vs Liability</h4>
      <p className="text-text-muted text-xs mb-4">
        Required reserve = {(result.reserveMultiplier * 100).toFixed(0)}% of remaining liability
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: '#6b7194', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7194', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            width={52}
          />
          <Tooltip content={<TooltipStyle />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Amount">
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function TaxCharts({ result }: Props) {
  return (
    <div className="space-y-4">
      <IncomeTaxChart result={result} />
      <ReserveComparisonChart result={result} />
    </div>
  )
}
