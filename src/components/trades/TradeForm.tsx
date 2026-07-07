import { useState } from 'react'
import { format } from 'date-fns'
import { ArrowUpRight, ArrowDownRight, X, PlusCircle } from 'lucide-react'
import type { DbTrade } from '../../types'
import { getContractSpec } from '../../lib/contract-specs'
import { formatCurrency, formatLocalDate } from '../../lib/utils'

type TradeInput = Omit<DbTrade, 'id' | 'user_id' | 'account_id' | 'created_at' | 'import_id'>

interface TradeFormProps {
  onClose: () => void
  onSave: (data: TradeInput) => Promise<void>
}

function nowLocal(): string {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm")
}

function emptyFields() {
  const now = nowLocal()
  return {
    qty: '1',
    entryPrice: '',
    exitPrice: '',
    entryDateTime: now,
    exitDateTime: now,
  }
}

export default function TradeForm({ onClose, onSave }: TradeFormProps) {
  const [symbol, setSymbol] = useState('')
  const [direction, setDirection] = useState<'Long' | 'Short'>('Long')
  const [pointValue, setPointValue] = useState('1')
  const [pointValueTouched, setPointValueTouched] = useState(false)
  const [commission, setCommission] = useState('0')
  const [fields, setFields] = useState(emptyFields())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedCount, setSavedCount] = useState(0)

  const spec = symbol.trim() ? getContractSpec(symbol.trim()) : null
  const isRecognized = !!spec && spec.name !== symbol.trim()

  function handleSymbolChange(value: string) {
    setSymbol(value)
    if (!pointValueTouched && value.trim()) {
      setPointValue(String(getContractSpec(value.trim()).pointValue))
    }
  }

  const qtyNum = parseInt(fields.qty, 10)
  const entryPriceNum = parseFloat(fields.entryPrice)
  const exitPriceNum = parseFloat(fields.exitPrice)
  const pointValueNum = parseFloat(pointValue)
  const commissionNum = parseFloat(commission) || 0

  const canPreview =
    !isNaN(qtyNum) && qtyNum > 0 &&
    !isNaN(entryPriceNum) && !isNaN(exitPriceNum) && !isNaN(pointValueNum)

  const grossPnl = canPreview
    ? (direction === 'Long' ? exitPriceNum - entryPriceNum : entryPriceNum - exitPriceNum) * qtyNum * pointValueNum
    : 0
  const netPnl = grossPnl - commissionNum

  function validate(): string | null {
    if (!symbol.trim()) return 'Symbol is required.'
    if (isNaN(qtyNum) || qtyNum <= 0) return 'Quantity must be a positive whole number.'
    if (isNaN(entryPriceNum) || entryPriceNum <= 0) return 'Entry price must be greater than 0.'
    if (isNaN(exitPriceNum) || exitPriceNum <= 0) return 'Exit price must be greater than 0.'
    if (isNaN(pointValueNum) || pointValueNum <= 0) return 'Point value must be greater than 0.'
    if (commissionNum < 0) return 'Commission cannot be negative.'
    if (!fields.entryDateTime || !fields.exitDateTime) return 'Entry and exit times are required.'
    const entryDate = new Date(fields.entryDateTime)
    const exitDate = new Date(fields.exitDateTime)
    if (exitDate < entryDate) return 'Exit time must be on or after entry time.'
    return null
  }

  async function handleSubmit(addAnother: boolean) {
    setError('')
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    const entryDate = new Date(fields.entryDateTime)
    const exitDate = new Date(fields.exitDateTime)
    const durationSeconds = Math.max(0, Math.round((exitDate.getTime() - entryDate.getTime()) / 1000))
    const manualId = crypto.randomUUID()

    setSaving(true)
    try {
      await onSave({
        symbol: symbol.trim().toUpperCase(),
        direction,
        entry_time: entryDate.toISOString(),
        exit_time: exitDate.toISOString(),
        entry_price: entryPriceNum,
        exit_price: exitPriceNum,
        qty: qtyNum,
        gross_pnl: Math.round(grossPnl * 100) / 100,
        commission: Math.round(commissionNum * 100) / 100,
        net_pnl: Math.round(netPnl * 100) / 100,
        trade_date: formatLocalDate(exitDate),
        duration_seconds: durationSeconds,
        point_value: pointValueNum,
        entry_order_id: `manual-${manualId}-entry`,
        exit_order_id: `manual-${manualId}-exit`,
      })
      setSavedCount(c => c + 1)
      if (addAnother) {
        setFields(emptyFields())
      } else {
        onClose()
      }
    } catch {
      setError('Failed to save trade. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-base border border-border rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-text-primary font-semibold text-base">Add Trade</h2>
            {savedCount > 0 && (
              <p className="text-text-dim text-xs mt-0.5">{savedCount} trade{savedCount !== 1 ? 's' : ''} added this session</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); void handleSubmit(false) }} className="px-6 py-5 space-y-5">
          {/* Symbol + Direction */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">
                Symbol
              </label>
              <input
                type="text"
                value={symbol}
                onChange={e => handleSymbolChange(e.target.value)}
                placeholder="NQH26"
                required
                autoFocus
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary uppercase placeholder:text-text-dim placeholder:normal-case focus:outline-none focus:border-accent/50 transition-colors"
              />
              {isRecognized && spec && (
                <p className="text-text-dim text-xs mt-1.5">{spec.name} · {formatCurrency(spec.pointValue)}/pt</p>
              )}
            </div>
            <div className="w-36">
              <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">
                Direction
              </label>
              <div className="flex bg-surface border border-border rounded-lg p-1 gap-1">
                {(['Long', 'Short'] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                      direction === d
                        ? d === 'Long' ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {d === 'Long' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Qty + Point Value + Commission */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">Qty</label>
              <input
                type="number"
                value={fields.qty}
                onChange={e => setFields(f => ({ ...f, qty: e.target.value }))}
                min={1}
                step={1}
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">Point Value</label>
              <input
                type="number"
                value={pointValue}
                onChange={e => { setPointValue(e.target.value); setPointValueTouched(true) }}
                min={0}
                step="any"
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">Commission</label>
              <input
                type="number"
                value={commission}
                onChange={e => setCommission(e.target.value)}
                min={0}
                step="any"
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>

          {/* Entry price/time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">Entry Price</label>
              <input
                type="number"
                value={fields.entryPrice}
                onChange={e => setFields(f => ({ ...f, entryPrice: e.target.value }))}
                min={0}
                step="any"
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">Entry Time</label>
              <input
                type="datetime-local"
                value={fields.entryDateTime}
                onChange={e => setFields(f => ({ ...f, entryDateTime: e.target.value }))}
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>

          {/* Exit price/time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">Exit Price</label>
              <input
                type="number"
                value={fields.exitPrice}
                onChange={e => setFields(f => ({ ...f, exitPrice: e.target.value }))}
                min={0}
                step="any"
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-text-muted text-xs font-medium uppercase tracking-wider mb-1.5">Exit Time</label>
              <input
                type="datetime-local"
                value={fields.exitDateTime}
                onChange={e => setFields(f => ({ ...f, exitDateTime: e.target.value }))}
                required
                className="w-full bg-surface border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          </div>

          {/* P&L preview */}
          {canPreview && (
            <div className="flex items-center gap-4 bg-surface border border-border rounded-lg px-4 py-3">
              <div className="flex-1">
                <div className="text-text-dim text-[10px] uppercase tracking-wider mb-0.5">Gross P&L</div>
                <div className={`font-mono text-sm font-semibold ${grossPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatCurrency(grossPnl)}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-text-dim text-[10px] uppercase tracking-wider mb-0.5">Net P&L</div>
                <div className={`font-mono text-sm font-bold ${netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatCurrency(netPnl)}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-loss text-sm bg-loss/10 border border-loss/20 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-hover text-sm font-medium transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-accent/40 text-accent hover:bg-accent/10 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save & Add Another'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-accent hover:bg-accent/90 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save & Close'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
