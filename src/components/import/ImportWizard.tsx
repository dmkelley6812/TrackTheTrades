import { useState, useCallback, useRef } from 'react'
import {
  Upload, FileText, CheckCircle2, XCircle, AlertCircle,
  Loader2, ChevronRight, RotateCcw, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { parseTradeStationCSV, getFilledOrders, orderToDbInsert, CSVParseError } from '../../lib/csv-parser'
import { matchTrades, tradeToDbInsert } from '../../lib/trade-matcher'
import { useAuth } from '../../contexts/AuthContext'
import type { MatchedTrade, ParsedOrder } from '../../types'
import { formatCurrency, formatDuration } from '../../lib/utils'

type Step = 'upload' | 'preview' | 'importing' | 'done'

interface PreviewState {
  fileName: string
  allOrders: ParsedOrder[]
  filledOrders: ParsedOrder[]
  allMatchedTrades: MatchedTrade[]
  existingOrderIds: Set<string>
  newTrades: MatchedTrade[]
  dupeTrades: MatchedTrade[]
  selectedTradeIds: Set<string>
}

function tradeKey(t: MatchedTrade) {
  return `${t.entryOrderId}_${t.exitOrderId}`
}

function tradeFingerprint(t: MatchedTrade): string {
  return `${t.symbol}|${t.direction}|${t.entryTime.toISOString()}|${t.exitTime.toISOString()}|${t.entryPrice}|${t.exitPrice}|${t.qty}`
}

interface ImportWizardProps {
  onImportComplete?: () => void
}

export default function ImportWizard({ onImportComplete }: ImportWizardProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('upload')
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please upload a CSV file.')
      return
    }
    setError(null)
    setProcessing(true)

    try {
      const text = await file.text()
      const allOrders = parseTradeStationCSV(text)
      const filledOrders = getFilledOrders(allOrders)

      if (filledOrders.length === 0) {
        throw new CSVParseError('No filled orders found. Make sure you\'re using the TradeStation Order History export from TradingView.')
      }

      const allMatchedRaw = matchTrades(filledOrders)

      // Step 1: Deduplicate within the CSV itself by content fingerprint
      const seenFps = new Set<string>()
      const allMatchedTrades: MatchedTrade[] = []
      for (const trade of allMatchedRaw) {
        const fp = tradeFingerprint(trade)
        if (!seenFps.has(fp)) {
          seenFps.add(fp)
          allMatchedTrades.push(trade)
        }
      }

      // Step 2: Check existing order IDs (needed to avoid duplicate order inserts)
      const orderIds = filledOrders.map(o => o.orderId)
      const { data: existingOrders } = await supabase
        .from('orders')
        .select('order_id')
        .eq('user_id', user!.id)
        .in('order_id', orderIds)
      const existingOrderIds = new Set((existingOrders ?? []).map(o => o.order_id))

      // Step 3: Check existing trades by content fingerprint (catches cross-file duplicates)
      const { data: existingDbTrades } = await supabase
        .from('trades')
        .select('symbol, direction, entry_time, exit_time, entry_price, exit_price, qty')
        .eq('user_id', user!.id)
      const existingTradeFps = new Set(
        (existingDbTrades ?? []).map(t =>
          `${t.symbol}|${t.direction}|${new Date(t.entry_time).toISOString()}|${new Date(t.exit_time).toISOString()}|${t.entry_price}|${t.exit_price}|${t.qty}`
        )
      )

      const newTrades: MatchedTrade[] = []
      const dupeTrades: MatchedTrade[] = []
      for (const trade of allMatchedTrades) {
        if (existingTradeFps.has(tradeFingerprint(trade))) dupeTrades.push(trade)
        else newTrades.push(trade)
      }

      setPreview({
        fileName: file.name,
        allOrders,
        filledOrders,
        allMatchedTrades,
        existingOrderIds,
        newTrades,
        dupeTrades,
        selectedTradeIds: new Set(newTrades.map(tradeKey)),
      })
      setStep('preview')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setProcessing(false)
    }
  }, [user])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  function toggleTrade(key: string) {
    if (!preview) return
    const next = new Set(preview.selectedTradeIds)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setPreview({ ...preview, selectedTradeIds: next })
  }

  function toggleAll(checked: boolean) {
    if (!preview) return
    setPreview({
      ...preview,
      selectedTradeIds: checked ? new Set(preview.newTrades.map(tradeKey)) : new Set(),
    })
  }

  async function handleImport() {
    if (!preview || !user) return
    setStep('importing')

    try {
      const selectedTrades = preview.newTrades.filter(t => preview.selectedTradeIds.has(tradeKey(t)))
      const ordersForSelectedTrades = new Set<string>()
      for (const t of selectedTrades) {
        ordersForSelectedTrades.add(t.entryOrderId)
        ordersForSelectedTrades.add(t.exitOrderId)
      }

      const { data: importRec, error: importErr } = await supabase
        .from('imports')
        .insert({
          user_id: user.id,
          file_name: preview.fileName,
          broker: 'TradeStation',
          order_count: preview.filledOrders.filter(o => ordersForSelectedTrades.has(o.orderId)).length,
          trade_count: selectedTrades.length,
        })
        .select()
        .single()

      if (importErr) throw importErr
      const importId = importRec.id

      const newOrders = preview.filledOrders.filter(o => !preview.existingOrderIds.has(o.orderId))
      if (newOrders.length > 0) {
        const { error: ordErr } = await supabase
          .from('orders')
          .insert(newOrders.map(o => orderToDbInsert(o, user.id, importId)))
        if (ordErr) throw ordErr
      }

      if (selectedTrades.length > 0) {
        const { error: tradeErr } = await supabase
          .from('trades')
          .insert(selectedTrades.map(t => tradeToDbInsert(t, user.id, importId)))
        if (tradeErr) throw tradeErr
      }

      setImportResult({ imported: selectedTrades.length, skipped: preview.dupeTrades.length })
      setStep('done')
      toast.success(`Imported ${selectedTrades.length} trade${selectedTrades.length !== 1 ? 's' : ''}!`)
      onImportComplete?.()
    } catch (e) {
      toast.error((e as Error).message)
      setStep('preview')
    }
  }

  function reset() {
    setStep('upload')
    setPreview(null)
    setImportResult(null)
    setError(null)
  }

  // ─── UPLOAD ───────────────────────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="space-y-4">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
            ${dragging
              ? 'border-accent bg-accent/10 shadow-glow'
              : 'border-border hover:border-border-bright hover:bg-surface/50'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${dragging ? 'bg-accent/20' : 'bg-surface'}`}>
              {processing
                ? <Loader2 className="w-8 h-8 text-accent animate-spin" />
                : <Upload className={`w-8 h-8 ${dragging ? 'text-accent' : 'text-text-dim'}`} />
              }
            </div>
            <div>
              <p className="text-text-primary font-semibold text-lg">
                {dragging ? 'Drop it here!' : 'Drop your CSV or click to browse'}
              </p>
              <p className="text-text-muted text-sm mt-1">
                TradeStation · Order History CSV export
              </p>
              <p className="text-text-dim text-xs mt-2">CSV · Max 10 MB</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-loss/10 border border-loss/30 rounded-xl px-4 py-3 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-loss flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-loss font-medium text-sm">Error</p>
              <p className="text-loss/80 text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl p-4">
          <p className="text-text-muted text-xs font-medium mb-3 uppercase tracking-wider">How to export from TradeStation</p>
          <ol className="text-text-dim text-sm space-y-2">
            {[
              'Log in to TradeStation Web (web.tradestation.com)',
              'Go to Accounts → Order History',
              'Set your desired date range, then click Export (↓ icon)',
              'Upload the downloaded CSV file here',
            ].map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      </div>
    )
  }

  // ─── PREVIEW ─────────────────────────────────────────────────────────────────
  if (step === 'preview' && preview) {
    const allSelected = preview.selectedTradeIds.size === preview.newTrades.length
    const someSelected = preview.selectedTradeIds.size > 0 && !allSelected
    const selectedNetPnl = preview.newTrades
      .filter(t => preview.selectedTradeIds.has(tradeKey(t)))
      .reduce((s, t) => s + t.netPnl, 0)

    return (
      <div className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Orders', value: preview.allOrders.length, sub: `${preview.filledOrders.length} filled`, col: '' },
            { label: 'Matched Trades', value: preview.allMatchedTrades.length, sub: 'round trips', col: 'text-accent' },
            { label: 'New Trades', value: preview.newTrades.length, sub: 'will be imported', col: 'text-profit' },
            { label: 'Already Imported', value: preview.dupeTrades.length, sub: 'will be skipped', col: 'text-text-muted' },
          ].map(s => (
            <div key={s.label} className="bg-surface border border-border rounded-xl p-3">
              <div className="text-text-dim text-xs uppercase tracking-wider mb-1">{s.label}</div>
              <div className={`font-mono text-xl font-bold ${s.col || 'text-text-primary'}`}>{s.value}</div>
              <div className="text-text-dim text-xs">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* File */}
        <div className="flex items-center gap-3 bg-surface border border-border rounded-lg px-3.5 py-2.5">
          <FileText className="w-4 h-4 text-accent" />
          <span className="text-text-muted text-sm">{preview.fileName}</span>
          <button onClick={reset} className="ml-auto text-text-dim hover:text-text-muted text-xs flex items-center gap-1 transition-colors">
            <RotateCcw className="w-3 h-3" /> Change file
          </button>
        </div>

        {/* New trades table */}
        {preview.newTrades.length > 0 && (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected }}
                  onChange={e => toggleAll(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <h3 className="text-text-muted text-xs font-medium uppercase tracking-wider">
                  New Trades — {preview.selectedTradeIds.size} selected
                </h3>
              </div>
              <span className={`font-mono text-sm font-semibold ${selectedNetPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                {formatCurrency(selectedNetPnl)} net P&L
              </span>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-base z-10">
                  <tr className="border-b border-border/50">
                    <th className="w-8 px-4 py-2.5" />
                    {['Dir', 'Symbol', 'Qty', 'Entry', 'Exit', 'Duration', 'Gross P&L', 'Commission', 'Net P&L'].map(h => (
                      <th key={h} className="text-left text-text-dim font-medium px-4 py-2.5 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.newTrades.map(trade => {
                    const key = tradeKey(trade)
                    const checked = preview.selectedTradeIds.has(key)
                    return (
                      <tr
                        key={key}
                        onClick={() => toggleTrade(key)}
                        className={`border-b border-border/30 cursor-pointer transition-colors ${
                          checked ? 'bg-accent/5 hover:bg-accent/8' : 'hover:bg-hover/30 opacity-50'
                        }`}
                      >
                        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTrade(key)}
                            className="w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`flex items-center gap-1 font-medium ${trade.direction === 'Long' ? 'text-profit' : 'text-loss'}`}>
                            {trade.direction === 'Long' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-text-primary">{trade.symbol}</td>
                        <td className="px-4 py-2.5 font-mono text-text-muted">{trade.qty}</td>
                        <td className="px-4 py-2.5 font-mono text-text-muted">{trade.entryPrice.toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-text-muted">{trade.exitPrice.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-text-dim whitespace-nowrap">{formatDuration(trade.durationSeconds)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`font-mono font-semibold ${trade.grossPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {formatCurrency(trade.grossPnl)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-text-dim">{formatCurrency(trade.commission)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`font-mono font-bold ${trade.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {formatCurrency(trade.netPnl)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dupe notice */}
        {preview.dupeTrades.length > 0 && (
          <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
            <p className="text-text-muted text-xs">
              <span className="font-semibold">{preview.dupeTrades.length} trade{preview.dupeTrades.length !== 1 ? 's' : ''}</span> already in your account and will be skipped.
            </p>
          </div>
        )}

        {/* No new trades */}
        {preview.newTrades.length === 0 && (
          <div className="bg-surface border border-border rounded-xl px-4 py-6 text-center">
            <CheckCircle2 className="w-8 h-8 text-profit mx-auto mb-2" />
            <p className="text-text-primary font-semibold text-sm">All trades already imported</p>
            <p className="text-text-muted text-xs mt-1">Nothing new to add from this file.</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={reset} className="flex items-center gap-2 text-text-dim hover:text-text-muted text-sm transition-colors">
            <RotateCcw className="w-4 h-4" /> Start over
          </button>
          <button
            onClick={handleImport}
            disabled={preview.selectedTradeIds.size === 0}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg px-5 py-2.5 text-sm font-semibold transition-all"
          >
            Import {preview.selectedTradeIds.size} trade{preview.selectedTradeIds.size !== 1 ? 's' : ''}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // ─── IMPORTING ───────────────────────────────────────────────────────────────
  if (step === 'importing') {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
        <p className="text-text-primary font-semibold">Importing trades…</p>
        <p className="text-text-muted text-sm">Saving to database</p>
      </div>
    )
  }

  // ─── DONE ────────────────────────────────────────────────────────────────────
  if (step === 'done' && importResult) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-profit/15 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-profit" />
        </div>
        <div>
          <h3 className="text-text-primary font-bold text-xl mb-1">Import complete!</h3>
          <p className="text-text-muted text-sm">
            <span className="text-profit font-semibold">{importResult.imported} trade{importResult.imported !== 1 ? 's' : ''}</span> imported
            {importResult.skipped > 0 && ` · ${importResult.skipped} duplicate${importResult.skipped !== 1 ? 's' : ''} skipped`}
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-surface border border-border hover:border-border-bright text-text-primary rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
          >
            <Upload className="w-4 h-4" /> Import another file
          </button>
          <a
            href="/dashboard"
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
          >
            View dashboard <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    )
  }

  return null
}
