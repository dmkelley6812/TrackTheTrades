import { useState, useMemo, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { ArrowUpRight, ArrowDownRight, ChevronUp, ChevronDown, Search, Filter, Trash2, AlertTriangle, X } from 'lucide-react'
import type { DbTrade } from '../../types'
import { formatCurrency, formatDuration } from '../../lib/utils'

type SortKey = 'exit_time' | 'net_pnl' | 'gross_pnl' | 'qty' | 'symbol'
type SortDir = 'asc' | 'desc'

interface Props {
  trades: DbTrade[]
  loading: boolean
  onDelete?: (ids: string[]) => Promise<void>
}

export default function TradesTable({ trades, loading, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('exit_time')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'long' | 'short' | 'wins' | 'losses'>('all')
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const PAGE_SIZE = 25

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(0)
  }

  const filtered = useMemo(() => {
    let result = [...trades]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(t => t.symbol.toLowerCase().includes(q))
    }
    if (filter === 'long') result = result.filter(t => t.direction === 'Long')
    else if (filter === 'short') result = result.filter(t => t.direction === 'Short')
    else if (filter === 'wins') result = result.filter(t => t.net_pnl > 0)
    else if (filter === 'losses') result = result.filter(t => t.net_pnl < 0)

    result.sort((a, b) => {
      let va: string | number = a[sortKey as keyof DbTrade] as string | number
      let vb: string | number = b[sortKey as keyof DbTrade] as string | number
      if (sortKey === 'exit_time') { va = new Date(va).getTime(); vb = new Date(vb).getTime() }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [trades, search, filter, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  // Selection helpers
  const pageIds = paginated.map(t => t.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))
  const somePageSelected = pageIds.some(id => selectedIds.has(id)) && !allPageSelected

  const selectAllRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = somePageSelected
  }, [somePageSelected])

  function toggleRow(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setConfirmDelete(false)
  }

  function togglePage(checked: boolean) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (checked) pageIds.forEach(id => next.add(id))
      else pageIds.forEach(id => next.delete(id))
      return next
    })
    setConfirmDelete(false)
  }

  async function handleDelete() {
    if (!onDelete || selectedIds.size === 0) return
    setDeleting(true)
    try {
      await onDelete(Array.from(selectedIds))
      setSelectedIds(new Set())
      setConfirmDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="opacity-0 group-hover:opacity-40"><ChevronDown className="w-3 h-3 inline" /></span>
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 inline text-accent" />
      : <ChevronDown className="w-3 h-3 inline text-accent" />
  }

  const FILTERS = ['all', 'long', 'short', 'wins', 'losses'] as const

  return (
    <div className="bg-surface border border-border rounded-xl shadow-card overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-dim" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search symbol..."
            className="w-full bg-base border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/60 transition-all"
          />
        </div>

        <div className="flex items-center gap-1">
          <Filter className="w-3.5 h-3.5 text-text-dim mr-1" />
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(0) }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-all ${
                filter === f
                  ? 'bg-accent/20 text-accent border border-accent/30'
                  : 'text-text-dim hover:text-text-muted hover:bg-hover'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <span className="text-text-dim text-xs">{filtered.length} trades</span>

        {/* Delete controls */}
        {onDelete && selectedIds.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            {confirmDelete ? (
              <>
                <div className="flex items-center gap-1.5 text-loss text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Delete {selectedIds.size} trade{selectedIds.size !== 1 ? 's' : ''}?</span>
                </div>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-text-muted hover:text-text-primary hover:bg-hover transition-all"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-loss/20 text-loss hover:bg-loss/30 disabled:opacity-50 border border-loss/30 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                  {deleting ? 'Deleting…' : 'Confirm'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setSelectedIds(new Set()); setConfirmDelete(false) }}
                  className="text-text-dim hover:text-text-muted text-xs transition-colors"
                >
                  Deselect all
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-loss/10 text-loss hover:bg-loss/20 border border-loss/20 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete {selectedIds.size}
                </button>
              </>
            )}
          </div>
        )}
        {onDelete && selectedIds.size === 0 && <span className="ml-auto" />}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              {onDelete && (
                <th className="w-10 px-4 py-2.5">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={e => togglePage(e.target.checked)}
                    className="w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
              )}
              {[
                { label: 'Date', key: 'exit_time' as SortKey },
                { label: 'Symbol', key: 'symbol' as SortKey },
                { label: 'Direction', key: null },
                { label: 'Qty', key: 'qty' as SortKey },
                { label: 'Entry', key: null },
                { label: 'Exit', key: null },
                { label: 'Duration', key: null },
                { label: 'Gross P&L', key: 'gross_pnl' as SortKey },
                { label: 'Commission', key: null },
                { label: 'Net P&L', key: 'net_pnl' as SortKey },
              ].map(({ label, key }) => (
                <th
                  key={label}
                  onClick={() => key && toggleSort(key)}
                  className={`text-left text-text-dim font-medium px-4 py-2.5 uppercase tracking-wider whitespace-nowrap ${key ? 'cursor-pointer hover:text-text-muted select-none group' : ''}`}
                >
                  {label} {key && <SortIcon col={key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/30">
                  {Array.from({ length: onDelete ? 11 : 10 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 bg-hover rounded animate-pulse" style={{ width: `${50 + (j * 13) % 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={onDelete ? 11 : 10} className="px-4 py-10 text-center text-text-dim">
                  No trades match the current filter
                </td>
              </tr>
            ) : (
              paginated.map(trade => {
                const isSelected = selectedIds.has(trade.id)
                return (
                <tr
                  key={trade.id}
                  className={`border-b border-border/30 transition-colors ${
                    isSelected ? 'bg-loss/5' : 'hover:bg-hover/50'
                  }`}
                >
                  {onDelete && (
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(trade.id)}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                    {format(new Date(trade.exit_time), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-text-primary font-medium">{trade.symbol}</td>
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-1 font-medium ${trade.direction === 'Long' ? 'text-profit' : 'text-loss'}`}>
                      {trade.direction === 'Long'
                        ? <ArrowUpRight className="w-3 h-3" />
                        : <ArrowDownRight className="w-3 h-3" />}
                      {trade.direction}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-text-muted">{trade.qty}</td>
                  <td className="px-4 py-2.5 font-mono text-text-muted">{trade.entry_price.toFixed(2)}</td>
                  <td className="px-4 py-2.5 font-mono text-text-muted">{trade.exit_price.toFixed(2)}</td>
                  <td className="px-4 py-2.5 text-text-dim whitespace-nowrap">
                    {trade.duration_seconds ? formatDuration(trade.duration_seconds) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono font-semibold ${trade.gross_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatCurrency(trade.gross_pnl)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-text-dim">{formatCurrency(trade.commission)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`font-mono font-bold ${trade.net_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatCurrency(trade.net_pnl)}
                    </span>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <span className="text-text-dim text-xs">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 rounded-md text-xs text-text-muted hover:text-text-primary hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(0, Math.min(page - 2, totalPages - 5)) + i
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-md text-xs transition-all ${p === page ? 'bg-accent/20 text-accent' : 'text-text-muted hover:bg-hover hover:text-text-primary'}`}
                >
                  {p + 1}
                </button>
              )
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-2.5 py-1 rounded-md text-xs text-text-muted hover:text-text-primary hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
