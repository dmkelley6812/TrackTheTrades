import { TrendingUp, TrendingDown, Target, Activity, Award, AlertTriangle, DollarSign, BarChart2 } from 'lucide-react'
import type { TradeStats } from '../../types'
import { formatCurrency, formatPercent } from '../../lib/utils'

interface Props {
  stats: TradeStats
  loading: boolean
}

interface CardProps {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  color?: 'default' | 'profit' | 'loss' | 'accent'
  loading: boolean
}

function StatCard({ label, value, sub, icon, color = 'default', loading }: CardProps) {
  const colorMap = {
    default: 'text-text-primary',
    profit: 'text-profit',
    loss: 'text-loss',
    accent: 'text-accent',
  }
  const bgMap = {
    default: 'bg-surface/50 text-text-dim',
    profit: 'bg-profit/10 text-profit',
    loss: 'bg-loss/10 text-loss',
    accent: 'bg-accent/10 text-accent',
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-card hover:border-border-bright transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-text-muted text-xs font-medium uppercase tracking-wider">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bgMap[color]}`}>
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">
          <div className="h-6 bg-hover rounded animate-pulse w-24" />
          <div className="h-3.5 bg-hover rounded animate-pulse w-16" />
        </div>
      ) : (
        <>
          <div className={`font-mono text-xl font-bold ${colorMap[color]}`}>{value}</div>
          {sub && <div className="text-text-muted text-xs mt-1">{sub}</div>}
        </>
      )}
    </div>
  )
}

export default function StatsCards({ stats, loading }: Props) {
  const pnlColor = stats.totalNetPnl >= 0 ? 'profit' : 'loss'

  const cards: CardProps[] = [
    {
      label: 'Net P&L',
      value: formatCurrency(stats.totalNetPnl),
      sub: `Gross ${formatCurrency(stats.totalGrossPnl)} · Comm ${formatCurrency(stats.totalCommission)}`,
      icon: <DollarSign className="w-4 h-4" />,
      color: pnlColor,
      loading,
    },
    {
      label: 'Win Rate',
      value: formatPercent(stats.winRate),
      sub: `${stats.winnerCount}W · ${stats.loserCount}L · ${stats.totalTrades} trades`,
      icon: <Target className="w-4 h-4" />,
      color: stats.winRate >= 0.5 ? 'profit' : 'loss',
      loading,
    },
    {
      label: 'Profit Factor',
      value: isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞',
      sub: stats.profitFactor >= 1.5 ? 'Strong edge' : stats.profitFactor >= 1 ? 'Positive edge' : 'Negative edge',
      icon: <BarChart2 className="w-4 h-4" />,
      color: stats.profitFactor >= 1.5 ? 'profit' : stats.profitFactor >= 1 ? 'accent' : 'loss',
      loading,
    },
    {
      label: 'Avg Win',
      value: formatCurrency(stats.avgWin),
      sub: `Best: ${formatCurrency(stats.bestTrade)}`,
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'profit',
      loading,
    },
    {
      label: 'Avg Loss',
      value: formatCurrency(-Math.abs(stats.avgLoss)),
      sub: `Worst: ${formatCurrency(stats.worstTrade)}`,
      icon: <TrendingDown className="w-4 h-4" />,
      color: 'loss',
      loading,
    },
    {
      label: 'Avg Trade',
      value: formatCurrency(stats.avgTrade),
      sub: `${stats.totalTrades} total trades`,
      icon: <Activity className="w-4 h-4" />,
      color: stats.avgTrade >= 0 ? 'profit' : 'loss',
      loading,
    },
    {
      label: 'Win Streak',
      value: `${stats.largestWinStreak}`,
      sub: `Loss streak: ${stats.largestLossStreak}`,
      icon: <Award className="w-4 h-4" />,
      color: 'accent',
      loading,
    },
    {
      label: 'Total Commission',
      value: formatCurrency(stats.totalCommission),
      sub: stats.totalTrades > 0 ? `${formatCurrency(stats.totalCommission / stats.totalTrades)} avg/trade` : undefined,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'default',
      loading,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(card => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  )
}
