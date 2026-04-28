import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Check, X, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAccount } from '../contexts/AccountContext'
import type { DbAccount, AccountType, ProductType } from '../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_TYPES: { value: AccountType; label: string; description: string }[] = [
  { value: 'paper',  label: 'Paper',  description: 'Simulated trading, no real money' },
  { value: 'demo',   label: 'Demo',   description: 'Broker demo account' },
  { value: 'live',   label: 'Live',   description: 'Real money account' },
]

const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: 'futures', label: 'Futures' },
  { value: 'stocks',  label: 'Stocks' },
  { value: 'crypto',  label: 'Crypto' },
  { value: 'forex',   label: 'Forex' },
  { value: 'options', label: 'Options' },
  { value: 'mixed',   label: 'Mixed' },
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF']

const PRESET_COLORS = [
  '#4a7cf4', // accent blue
  '#22d984', // profit green
  '#f14b4b', // loss red
  '#a855f7', // purple
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

const ACCOUNT_TYPE_BADGE: Record<AccountType, string> = {
  paper: 'text-accent bg-accent/15 border-accent/20',
  demo:  'text-text-muted bg-surface border-border',
  live:  'text-profit bg-profit/15 border-profit/20',
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface FormState {
  name: string
  account_type: AccountType
  product_type: ProductType
  broker: string
  currency: string
  starting_balance: string
  color: string
  description: string
}

const DEFAULT_FORM: FormState = {
  name: '',
  account_type: 'paper',
  product_type: 'futures',
  broker: '',
  currency: 'USD',
  starting_balance: '',
  color: '#4a7cf4',
  description: '',
}

function accountToForm(a: DbAccount): FormState {
  return {
    name: a.name,
    account_type: a.account_type,
    product_type: a.product_type,
    broker: a.broker,
    currency: a.currency,
    starting_balance: a.starting_balance !== null ? String(a.starting_balance) : '',
    color: a.color,
    description: a.description ?? '',
  }
}

interface AccountFormProps {
  initial?: FormState
  onSave: (data: FormState) => Promise<void>
  onCancel: () => void
  saving: boolean
}

function AccountForm({ initial = DEFAULT_FORM, onSave, onCancel, saving }: AccountFormProps) {
  const [form, setForm] = useState<FormState>(initial)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Account name is required'); return }
    await onSave(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="block text-text-muted text-xs font-medium mb-1.5">Account Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="e.g. Paper Trading 2024"
          className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-text-primary text-sm placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
        />
      </div>

      {/* Account type */}
      <div>
        <label className="block text-text-muted text-xs font-medium mb-1.5">Account Type</label>
        <div className="grid grid-cols-3 gap-2">
          {ACCOUNT_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => set('account_type', t.value)}
              className={`flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${
                form.account_type === t.value
                  ? 'border-accent/50 bg-accent/10'
                  : 'border-border bg-deep hover:border-border-bright'
              }`}
            >
              <span className={`text-xs font-semibold ${form.account_type === t.value ? 'text-accent' : 'text-text-primary'}`}>
                {t.label}
              </span>
              <span className="text-text-dim text-[10px] mt-0.5 leading-snug">{t.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product type + Broker in a row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-muted text-xs font-medium mb-1.5">Product Type</label>
          <select
            value={form.product_type}
            onChange={e => set('product_type', e.target.value as ProductType)}
            className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/50 transition-colors"
          >
            {PRODUCT_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-text-muted text-xs font-medium mb-1.5">Broker</label>
          <input
            type="text"
            value={form.broker}
            onChange={e => set('broker', e.target.value)}
            placeholder="e.g. TradeStation"
            className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-text-primary text-sm placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
      </div>

      {/* Starting balance + Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-text-muted text-xs font-medium mb-1.5">Starting Balance</label>
          <input
            type="number"
            value={form.starting_balance}
            onChange={e => set('starting_balance', e.target.value)}
            placeholder="Optional"
            min="0"
            step="0.01"
            className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-text-primary text-sm placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-text-muted text-xs font-medium mb-1.5">Currency</label>
          <select
            value={form.currency}
            onChange={e => set('currency', e.target.value)}
            className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent/50 transition-colors"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-text-muted text-xs font-medium mb-1.5">Color</label>
        <div className="flex items-center gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => set('color', c)}
              className={`w-7 h-7 rounded-full transition-transform hover:scale-110 flex-shrink-0 ${form.color === c ? 'ring-2 ring-offset-2 ring-offset-base ring-white/40 scale-110' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={form.color}
            onChange={e => set('color', e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border border-border bg-transparent"
            title="Custom color"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-text-muted text-xs font-medium mb-1.5">Notes <span className="text-text-dim">(optional)</span></label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Any details about this account…"
          rows={2}
          className="w-full bg-deep border border-border rounded-lg px-3 py-2 text-text-primary text-sm placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-colors resize-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-surface border border-border hover:border-border-bright text-text-muted rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition-all"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Save
        </button>
      </div>
    </form>
  )
}

// ─── Account card ─────────────────────────────────────────────────────────────

interface AccountCardProps {
  account: DbAccount
  isActive: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  canDelete: boolean
}

function AccountCard({ account, isActive, onSelect, onEdit, onDelete, canDelete }: AccountCardProps) {
  return (
    <div
      className={`bg-surface border rounded-xl p-4 transition-all ${
        isActive ? 'border-accent/40 shadow-glow' : 'border-border hover:border-border-bright'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Color swatch */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: account.color + '22' }}
        >
          <Briefcase className="w-5 h-5" style={{ color: account.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-text-primary font-semibold text-sm">{account.name}</h3>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${ACCOUNT_TYPE_BADGE[account.account_type]}`}>
              {account.account_type.toUpperCase()}
            </span>
            {isActive && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md border text-accent bg-accent/10 border-accent/20">
                ACTIVE
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            <span className="text-text-dim text-xs">{account.product_type}</span>
            {account.broker && <span className="text-text-dim text-xs">{account.broker}</span>}
            {account.starting_balance !== null && (
              <span className="text-text-dim text-xs">
                Starting: {account.currency} {Number(account.starting_balance).toLocaleString()}
              </span>
            )}
          </div>

          {account.description && (
            <p className="text-text-dim text-xs mt-1.5 line-clamp-2">{account.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        {!isActive && (
          <button
            onClick={onSelect}
            className="flex-1 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
          >
            Switch to this account
          </button>
        )}
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 bg-surface border border-border hover:border-border-bright text-text-muted hover:text-text-primary rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-text-dim hover:text-loss hover:bg-loss/10 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const { accounts, activeAccount, setActiveAccount, createAccount, updateAccount, deleteAccount } = useAccount()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showNew, setShowNew] = useState(searchParams.get('new') === '1')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Clear the ?new=1 param once opened
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setSearchParams({}, { replace: true })
    }
  }, [])

  async function handleCreate(form: FormState) {
    setSaving(true)
    try {
      const account = await createAccount({
        name: form.name.trim(),
        account_type: form.account_type,
        product_type: form.product_type,
        broker: form.broker.trim(),
        currency: form.currency,
        starting_balance: form.starting_balance ? Number(form.starting_balance) : null,
        color: form.color,
        is_default: false,
        description: form.description.trim() || null,
      })
      setActiveAccount(account)
      setShowNew(false)
      toast.success('Account created!')
    } catch {
      toast.error('Failed to create account')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: string, form: FormState) {
    setSaving(true)
    try {
      await updateAccount(id, {
        name: form.name.trim(),
        account_type: form.account_type,
        product_type: form.product_type,
        broker: form.broker.trim(),
        currency: form.currency,
        starting_balance: form.starting_balance ? Number(form.starting_balance) : null,
        color: form.color,
        description: form.description.trim() || null,
      })
      setEditingId(null)
      toast.success('Account updated!')
    } catch {
      toast.error('Failed to update account')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? All trades and data in this account will be permanently removed.`)) return
    try {
      await deleteAccount(id)
      toast.success('Account deleted')
    } catch {
      toast.error('Failed to delete account')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-xl font-bold">Accounts</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Manage separate trading accounts — paper, demo, and live
          </p>
        </div>
        {!showNew && (
          <button
            onClick={() => { setEditingId(null); setShowNew(true) }}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all"
          >
            <Plus className="w-4 h-4" />
            New Account
          </button>
        )}
      </div>

      {/* New account form */}
      {showNew && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-text-primary font-semibold text-sm">Create New Account</h2>
            <button onClick={() => setShowNew(false)} className="text-text-dim hover:text-text-muted transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <AccountForm
            onSave={handleCreate}
            onCancel={() => setShowNew(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Account list */}
      <div className="space-y-3">
        {accounts.map(account => (
          editingId === account.id ? (
            <div key={account.id} className="bg-surface border border-accent/30 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-text-primary font-semibold text-sm">Edit Account</h2>
                <button onClick={() => setEditingId(null)} className="text-text-dim hover:text-text-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <AccountForm
                initial={accountToForm(account)}
                onSave={form => handleUpdate(account.id, form)}
                onCancel={() => setEditingId(null)}
                saving={saving}
              />
            </div>
          ) : (
            <AccountCard
              key={account.id}
              account={account}
              isActive={activeAccount?.id === account.id}
              onSelect={() => setActiveAccount(account)}
              onEdit={() => { setShowNew(false); setEditingId(account.id) }}
              onDelete={() => handleDelete(account.id, account.name)}
              canDelete={accounts.length > 1}
            />
          )
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-text-primary font-semibold text-lg mb-2">No accounts yet</h3>
          <p className="text-text-muted text-sm mb-4">Create your first trading account to get started.</p>
          <button
            onClick={() => setShowNew(true)}
            className="bg-accent hover:bg-accent/90 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all"
          >
            Create account
          </button>
        </div>
      )}
    </div>
  )
}
