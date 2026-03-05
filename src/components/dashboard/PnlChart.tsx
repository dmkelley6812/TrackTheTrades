import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'
import { format } from 'date-fns'
import type { CumulativePnl, DailyPnl } from '../../types'
import { formatCurrency } from '../../lib/utils'

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CumulativeTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-card text-xs">
      <div className="text-text-muted mb-1">{label}</div>
      <div className={`font-mono font-semibold text-sm ${val >= 0 ? 'text-profit' : 'text-loss'}`}>
        {formatCurrency(val)}
      </div>
    </div>
  )
}

function DailyTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-card text-xs">
      <div className="text-text-muted mb-1">{label}</div>
      <div className={`font-mono font-semibold text-sm ${val >= 0 ? 'text-profit' : 'text-loss'}`}>
        {formatCurrency(val)}
      </div>
    </div>
  )
}

// ─── Equity Curve ─────────────────────────────────────────────────────────────

export function EquityCurve({ data, loading }: { data: CumulativePnl[]; loading: boolean }) {
  const isPositive = (data[data.length - 1]?.cumulative ?? 0) >= 0
  const color = isPositive ? '#22d984' : '#f14b4b'

  const formatted = data.map(d => ({
    ...d,
    date: format(new Date(d.date + 'T00:00:00'), 'MMM d'),
  }))

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card">
      <h3 className="text-text-muted text-xs font-medium uppercase tracking-wider mb-4">Equity Curve</h3>
      {loading ? (
        <div className="h-48 bg-hover rounded-lg animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-text-dim text-sm">
          No trade data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2138" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7194', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7194', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => formatCurrency(v, true)}
              width={60}
            />
            <Tooltip content={<CumulativeTooltip />} />
            <ReferenceLine y={0} stroke="#2a2d4a" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke={color}
              strokeWidth={2}
              fill="url(#equityGrad)"
              dot={false}
              activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Daily P&L Bars ───────────────────────────────────────────────────────────

export function DailyBars({ data, loading }: { data: DailyPnl[]; loading: boolean }) {
  const formatted = data.map(d => ({
    ...d,
    date: format(new Date(d.date + 'T00:00:00'), 'MMM d'),
  }))

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card">
      <h3 className="text-text-muted text-xs font-medium uppercase tracking-wider mb-4">Daily P&L</h3>
      {loading ? (
        <div className="h-48 bg-hover rounded-lg animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-text-dim text-sm">
          No trade data for this period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={formatted} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2138" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7194', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#6b7194', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => formatCurrency(v, true)}
              width={60}
            />
            <Tooltip content={<DailyTooltip />} />
            <ReferenceLine y={0} stroke="#2a2d4a" />
            <Bar dataKey="netPnl" radius={[3, 3, 0, 0]}>
              {formatted.map((entry, i) => (
                <Cell key={i} fill={entry.netPnl >= 0 ? '#22d984' : '#f14b4b'} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
