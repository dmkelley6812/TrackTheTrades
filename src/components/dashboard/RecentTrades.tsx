import { format } from 'date-fns'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import type { DbTrade } from '../../types'
import { formatCurrency, formatDuration } from '../../lib/utils'

interface Props {
  trades: DbTrade[]
  loading: boolean
}

export default function RecentTrades({ trades, loading }: Props) {
  const recent = trades.slice(0, 10)

  return (
    <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-text-muted text-xs font-medium uppercase tracking-wider">Recent Trades</h3>
        <span className="text-text-dim text-xs">{trades.length} total</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              {['Symbol', 'Dir', 'Qty', 'Entry', 'Exit', 'Duration', 'Net P&L'].map(h => (
                <th key={h} className="text-left text-text-dim text-xs font-medium px-4 py-2.5 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/30">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-hover rounded animate-pulse" style={{ width: `${60 + (j * 10) % 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : recent.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-text-dim text-sm">
                  No trades found for this period
                </td>
              </tr>
            ) : (
              recent.map(trade => (
                <tr key={trade.id} className="border-b border-border/30 hover:bg-hover/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-text-primary text-xs font-medium">
                    {trade.symbol}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-1 text-xs font-medium ${trade.direction === 'Long' ? 'text-profit' : 'text-loss'}`}>
                      {trade.direction === 'Long'
                        ? <ArrowUpRight className="w-3 h-3" />
                        : <ArrowDownRight className="w-3 h-3" />}
                      {trade.direction}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-text-muted text-xs">{trade.qty}</td>
                  <td className="px-4 py-2.5 font-mono text-text-muted text-xs">
                    {trade.entry_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-text-muted text-xs">
                    {trade.exit_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5 text-text-dim text-xs">
                    {trade.duration_seconds ? formatDuration(trade.duration_seconds) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono text-xs font-semibold ${trade.net_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatCurrency(trade.net_pnl)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
