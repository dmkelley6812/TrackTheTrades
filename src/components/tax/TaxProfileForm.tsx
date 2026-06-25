import { useState, useEffect } from 'react'
import { Save, RotateCcw, Info } from 'lucide-react'
import type { DbTaxProfile, FilingStatus, TaxReserveMode, TaxDeductionMethod, AssetClassIncome } from '../../types'
import { ALL_STATES } from '../../lib/state-tax'
import { formatCurrency } from '../../lib/utils'

interface Props {
  profile: DbTaxProfile | null
  autoAssetIncome: AssetClassIncome
  saving: boolean
  onSave: (data: Omit<DbTaxProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void
}

const FILING_STATUS_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: 'single',               label: 'Single' },
  { value: 'married_jointly',      label: 'Married Filing Jointly' },
  { value: 'married_separately',   label: 'Married Filing Separately' },
  { value: 'head_of_household',    label: 'Head of Household' },
]

const RESERVE_MODES: { value: TaxReserveMode; label: string; desc: string; mult: string }[] = [
  { value: 'minimum',      label: 'Minimum',      desc: '90% of estimated liability', mult: '90%' },
  { value: 'recommended',  label: 'Recommended',  desc: '100% of estimated liability',mult: '100%' },
  { value: 'conservative', label: 'Conservative', desc: '115% of estimated liability',mult: '115%' },
]

function inputClass(error?: boolean) {
  return `w-full px-3 py-2 bg-deep border ${error ? 'border-loss/50' : 'border-border'} rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent/60 transition-colors`
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-text-primary font-semibold text-sm">{title}</h3>
      {subtitle && <p className="text-text-muted text-xs mt-0.5">{subtitle}</p>}
    </div>
  )
}

function Label({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <label className="block text-text-muted text-xs font-medium mb-1.5">
      {children}
      {note && <span className="text-text-dim ml-1 font-normal">{note}</span>}
    </label>
  )
}

function AssetField({
  label,
  assetClass,
  autoValue,
  overrideValue,
  onChange,
  tag,
}: {
  label: string
  assetClass: string
  autoValue: number
  overrideValue: string
  onChange: (value: string) => void
  tag: string
}) {
  const hasOverride = overrideValue !== ''
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <Label>
          {label}
          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-hover text-text-dim font-normal">{tag}</span>
        </Label>
        {hasOverride && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-text-dim hover:text-accent text-[10px] flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset to auto
          </button>
        )}
      </div>
      <input
        type="number"
        value={overrideValue}
        onChange={e => onChange(e.target.value)}
        placeholder={`Auto: ${formatCurrency(autoValue)}`}
        className={inputClass()}
        step="0.01"
      />
      {!hasOverride && (
        <p className="text-text-dim text-[10px] mt-1">
          Auto-computed from trades: {formatCurrency(autoValue)}
        </p>
      )}
    </div>
  )
}

function CurrencyInput({
  value,
  onChange,
  placeholder,
  min,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  min?: number
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? '0'}
      min={min ?? 0}
      step="0.01"
      className={inputClass()}
    />
  )
}

export default function TaxProfileForm({ profile, autoAssetIncome, saving, onSave }: Props) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('single')
  const [state, setState] = useState('TX')
  const [w2Income, setW2Income] = useState('')
  const [otherOrdinaryIncome, setOtherOrdinaryIncome] = useState('')
  const [deductionMethod, setDeductionMethod] = useState<TaxDeductionMethod>('standard')
  const [itemizedAmount, setItemizedAmount] = useState('')
  const [qualifyingChildren, setQualifyingChildren] = useState('0')
  const [otherDependents, setOtherDependents] = useState('0')
  const [reserveMode, setReserveMode] = useState<TaxReserveMode>('recommended')
  const [taxPaymentsMade, setTaxPaymentsMade] = useState('')
  const [taxSavingsBalance, setTaxSavingsBalance] = useState('')
  // Asset class overrides (empty string = use auto)
  const [futuresOverride, setFuturesOverride] = useState('')
  const [stocksOverride, setStocksOverride] = useState('')
  const [optionsOverride, setOptionsOverride] = useState('')
  const [cryptoOverride, setCryptoOverride] = useState('')
  const [forexOverride, setForexOverride] = useState('')

  // Populate form when profile loads
  useEffect(() => {
    if (!profile) return
    setFilingStatus(profile.filing_status)
    setState(profile.state)
    setW2Income(profile.w2_income > 0 ? String(profile.w2_income) : '')
    setOtherOrdinaryIncome(profile.other_ordinary_income > 0 ? String(profile.other_ordinary_income) : '')
    setDeductionMethod(profile.deduction_method)
    setItemizedAmount(profile.itemized_deduction_amount > 0 ? String(profile.itemized_deduction_amount) : '')
    setQualifyingChildren(String(profile.qualifying_children ?? 0))
    setOtherDependents(String(profile.other_dependents ?? 0))
    setReserveMode(profile.reserve_mode)
    setTaxPaymentsMade(profile.tax_payments_made > 0 ? String(profile.tax_payments_made) : '')
    setTaxSavingsBalance(profile.tax_savings_balance > 0 ? String(profile.tax_savings_balance) : '')
    setFuturesOverride(profile.futures_profit_override !== null ? String(profile.futures_profit_override) : '')
    setStocksOverride(profile.stocks_profit_override  !== null ? String(profile.stocks_profit_override)  : '')
    setOptionsOverride(profile.options_profit_override !== null ? String(profile.options_profit_override) : '')
    setCryptoOverride(profile.crypto_profit_override  !== null ? String(profile.crypto_profit_override)  : '')
    setForexOverride(profile.forex_profit_override    !== null ? String(profile.forex_profit_override)   : '')
  }, [profile])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      filing_status:             filingStatus,
      state,
      w2_income:                 Number(w2Income) || 0,
      other_ordinary_income:     Number(otherOrdinaryIncome) || 0,
      deduction_method:          deductionMethod,
      itemized_deduction_amount: Number(itemizedAmount) || 0,
      reserve_mode:              reserveMode,
      tax_payments_made:         Number(taxPaymentsMade) || 0,
      tax_savings_balance:       Number(taxSavingsBalance) || 0,
      qualifying_children:       Math.max(0, Math.floor(Number(qualifyingChildren) || 0)),
      other_dependents:          Math.max(0, Math.floor(Number(otherDependents)    || 0)),
      futures_profit_override:   futuresOverride !== '' ? Number(futuresOverride) : null,
      stocks_profit_override:    stocksOverride  !== '' ? Number(stocksOverride)  : null,
      options_profit_override:   optionsOverride !== '' ? Number(optionsOverride) : null,
      crypto_profit_override:    cryptoOverride  !== '' ? Number(cryptoOverride)  : null,
      forex_profit_override:     forexOverride   !== '' ? Number(forexOverride)   : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">

      {/* ── Section 1: Filing information ─────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <SectionHeader
          title="Filing Information"
          subtitle="Your federal filing status and state of residence"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Filing Status</Label>
            <select
              value={filingStatus}
              onChange={e => setFilingStatus(e.target.value as FilingStatus)}
              className={inputClass()}
            >
              {FILING_STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>State of Residence</Label>
            <select
              value={state}
              onChange={e => setState(e.target.value)}
              className={inputClass()}
            >
              {ALL_STATES.map(s => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code}){s.type === 'none' ? ' — No income tax' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Section 2: Non-trading income ────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <SectionHeader
          title="Non-Trading Income"
          subtitle="Annual amounts — leave blank if not applicable"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>W-2 / Salary Income (annual)</Label>
            <CurrencyInput value={w2Income} onChange={setW2Income} placeholder="0" />
          </div>
          <div>
            <Label>Other Ordinary Income (annual)</Label>
            <CurrencyInput value={otherOrdinaryIncome} onChange={setOtherOrdinaryIncome} placeholder="0" />
          </div>
        </div>
      </div>

      {/* ── Section 3: Deductions ─────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <SectionHeader
          title="Deductions"
          subtitle="Standard deduction is applied automatically based on filing status"
        />
        <div className="flex gap-3 mb-4">
          {(['standard', 'itemized'] as TaxDeductionMethod[]).map(method => (
            <button
              key={method}
              type="button"
              onClick={() => setDeductionMethod(method)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                deductionMethod === method
                  ? 'bg-accent/15 text-accent border-accent/30'
                  : 'bg-deep text-text-muted border-border hover:border-border-bright'
              }`}
            >
              {method === 'standard' ? 'Standard Deduction' : 'Itemized Deduction'}
            </button>
          ))}
        </div>
        {deductionMethod === 'itemized' && (
          <div>
            <Label>Total Itemized Deductions</Label>
            <CurrencyInput value={itemizedAmount} onChange={setItemizedAmount} placeholder="0" />
          </div>
        )}
        {deductionMethod === 'standard' && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-accent/5 border border-accent/15 rounded-lg">
            <Info className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-text-muted text-xs">
              Standard deduction is applied automatically:
              Single / MFS = $15,000 · MFJ = $30,000 · HOH = $22,500 (2025)
            </p>
          </div>
        )}
      </div>

      {/* ── Section 3b: Tax credits ──────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <SectionHeader
          title="Tax Credits"
          subtitle="Credits reduce your tax bill dollar-for-dollar — more impactful than deductions"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Qualifying Children Under 17</Label>
            <input
              type="number"
              value={qualifyingChildren}
              onChange={e => setQualifyingChildren(e.target.value)}
              min={0}
              max={20}
              step={1}
              className={inputClass()}
            />
            <p className="text-text-muted text-[11px] mt-1.5">
              {Math.max(0, Math.floor(Number(qualifyingChildren) || 0))} × $2,000 ={' '}
              <span className="text-profit font-medium">
                ${(Math.max(0, Math.floor(Number(qualifyingChildren) || 0)) * 2000).toLocaleString()} credit
              </span>
            </p>
            <p className="text-text-dim text-[10px] mt-0.5">
              Phases out above $200k AGI (single) / $400k (married)
            </p>
          </div>
          <div>
            <Label>Other Qualifying Dependents</Label>
            <input
              type="number"
              value={otherDependents}
              onChange={e => setOtherDependents(e.target.value)}
              min={0}
              max={20}
              step={1}
              className={inputClass()}
            />
            <p className="text-text-muted text-[11px] mt-1.5">
              {Math.max(0, Math.floor(Number(otherDependents) || 0))} × $500 ={' '}
              <span className="text-profit font-medium">
                ${(Math.max(0, Math.floor(Number(otherDependents) || 0)) * 500).toLocaleString()} credit
              </span>
            </p>
            <p className="text-text-dim text-[10px] mt-0.5">
              College-age children (17–18), elderly parents, or other qualifying dependents
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 4: Trading income by asset class ──────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <SectionHeader
          title="Trading Income by Asset Class (YTD)"
          subtitle="Auto-computed from your trades. Enter an override to use a different value."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AssetField
            label="Futures P&L"
            assetClass="futures"
            autoValue={autoAssetIncome.futures}
            overrideValue={futuresOverride}
            onChange={setFuturesOverride}
            tag="60/40 Section 1256"
          />
          <AssetField
            label="Stocks P&L"
            assetClass="stocks"
            autoValue={autoAssetIncome.stocks}
            overrideValue={stocksOverride}
            onChange={setStocksOverride}
            tag="Short-term"
          />
          <AssetField
            label="Options P&L"
            assetClass="options"
            autoValue={autoAssetIncome.options}
            overrideValue={optionsOverride}
            onChange={setOptionsOverride}
            tag="Short-term"
          />
          <AssetField
            label="Crypto P&L"
            assetClass="crypto"
            autoValue={autoAssetIncome.crypto}
            overrideValue={cryptoOverride}
            onChange={setCryptoOverride}
            tag="Short-term"
          />
          <AssetField
            label="Forex P&L"
            assetClass="forex"
            autoValue={autoAssetIncome.forex}
            overrideValue={forexOverride}
            onChange={setForexOverride}
            tag="Ordinary income"
          />
        </div>
        <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-hover border border-border rounded-lg">
          <Info className="w-3.5 h-3.5 text-text-dim flex-shrink-0 mt-0.5" />
          <p className="text-text-dim text-xs">
            Futures use the Section 1256 60/40 rule: 60% taxed at long-term capital gains rates,
            40% at ordinary income rates. Stocks, options, and crypto assume short-term treatment.
          </p>
        </div>
      </div>

      {/* ── Section 5: Reserve settings ──────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <SectionHeader
          title="Reserve Settings"
          subtitle="How much of your estimated liability to hold in reserve"
        />

        {/* Reserve mode */}
        <div className="mb-5">
          <Label>Tax Reserve Mode</Label>
          <div className="grid grid-cols-3 gap-3">
            {RESERVE_MODES.map(mode => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setReserveMode(mode.value)}
                className={`px-3 py-3 rounded-lg text-left border transition-all ${
                  reserveMode === mode.value
                    ? 'bg-accent/15 border-accent/30'
                    : 'bg-deep border-border hover:border-border-bright'
                }`}
              >
                <div className={`text-sm font-semibold ${reserveMode === mode.value ? 'text-accent' : 'text-text-primary'}`}>
                  {mode.label}
                </div>
                <div className="text-text-dim text-xs mt-0.5">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label note="(quarterly estimated + withholding)">Tax Payments Made YTD</Label>
            <CurrencyInput value={taxPaymentsMade} onChange={setTaxPaymentsMade} placeholder="0" />
          </div>
          <div>
            <Label note="(current balance in your reserve account)">Tax Savings Account Balance</Label>
            <CurrencyInput value={taxSavingsBalance} onChange={setTaxSavingsBalance} placeholder="0" />
          </div>
        </div>
      </div>

      {/* ── Save button ───────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Tax Profile
        </button>
      </div>
    </form>
  )
}
