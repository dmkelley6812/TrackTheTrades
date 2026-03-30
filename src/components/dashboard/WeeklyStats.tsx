import type { WeeklyStats } from '../../types'
import { formatCurrency, formatPercent } from '../../lib/utils'

interface Props {
  data: WeeklyStats[]
  loading: boolean
}

function PnlCell({ value, empty }: { value: number; empty: boolean }) {
  if (empty) return <span className="text-text-dim">—</span>
  return (
    <span className={`font-mono font-semibold ${value > 0 ? 'text-profit' : value < 0 ? 'text-loss' : 'text-text-muted'}`}>
      {formatCurrency(value)}
    </span>
  )
}

export default function WeeklyStatsTable({ data, loading }: Props) {
  return (
    <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <h3 className="text-text-muted text-xs font-medium uppercase tracking-wider">Weekly Performance</h3>
      </div>

      {loading ? (
        <div className="px-4 pb-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 bg-hover rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-text-dim text-xs font-medium px-4 py-2 uppercase tracking-wider">Week</th>
                <th className="text-right text-text-dim text-xs font-medium px-4 py-2 uppercase tracking-wider">Net P&L</th>
                <th className="text-right text-text-dim text-xs font-medium px-4 py-2 uppercase tracking-wider">Trades</th>
                <th className="text-right text-text-dim text-xs font-medium px-4 py-2 uppercase tracking-wider">Win Rate</th>
                <th className="text-right text-text-dim text-xs font-medium px-4 py-2 uppercase tracking-wider">P. Factor</th>
                <th className="text-right text-text-dim text-xs font-medium px-4 py-2 uppercase tracking-wider">Best Day</th>
                <th className="text-right text-text-dim text-xs font-medium px-4 py-2 uppercase tracking-wider">Worst Day</th>
              </tr>
            </thead>
            <tbody>
              {data.map((week, i) => {
                const empty = week.tradeCount === 0
                const isCurrentWeek = i === 0
                return (
                  <tr
                    key={week.weekStart}
                    className={`border-b border-border/50 transition-colors hover:bg-hover/50 ${
                      isCurrentWeek ? 'bg-accent/5' : ''
                    } ${empty ? 'opacity-40' : ''}`}
                  >
                    {/* Week label */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono ${empty ? 'text-text-dim' : 'text-text-primary'}`}>
                          {week.weekLabel}
                        </span>
                        {isCurrentWeek && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                            current
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Net P&L — colored left border strip */}
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`inline-block w-1 h-5 rounded-full flex-shrink-0 ${
                            empty ? 'bg-border' : week.netPnl > 0 ? 'bg-profit/60' : week.netPnl < 0 ? 'bg-loss/60' : 'bg-border'
                          }`}
                        />
                        <PnlCell value={week.netPnl} empty={empty} />
                      </div>
                    </td>

                    {/* Trades */}
                    <td className="px-4 py-2.5 text-right">
                      {empty ? (
                        <span className="text-text-dim">—</span>
                      ) : (
                        <span className="text-text-primary font-mono">{week.tradeCount}</span>
                      )}
                    </td>

                    {/* Win Rate */}
                    <td className="px-4 py-2.5 text-right">
                      {empty ? (
                        <span className="text-text-dim">—</span>
                      ) : (
                        <div>
                          <span className={`font-mono font-semibold ${week.winRate >= 0.5 ? 'text-profit' : 'text-loss'}`}>
                            {formatPercent(week.winRate, 0)}
                          </span>
                          <span className="text-text-dim text-xs ml-1.5">
                            {week.winCount}W/{week.lossCount}L
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Profit Factor */}
                    <td className="px-4 py-2.5 text-right">
                      {empty ? (
                        <span className="text-text-dim">—</span>
                      ) : (
                        <span className={`font-mono ${
                          week.profitFactor >= 1.5 ? 'text-profit' :
                          week.profitFactor >= 1 ? 'text-text-primary' :
                          'text-loss'
                        }`}>
                          {isFinite(week.profitFactor) ? week.profitFactor.toFixed(2) : '∞'}
                        </span>
                      )}
                    </td>

                    {/* Best Day */}
                    <td className="px-4 py-2.5 text-right">
                      <PnlCell value={week.bestDay} empty={empty} />
                    </td>

                    {/* Worst Day */}
                    <td className="px-4 py-2.5 text-right">
                      <PnlCell value={week.worstDay} empty={empty} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
