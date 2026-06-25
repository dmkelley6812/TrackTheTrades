import { useState, useEffect, useMemo } from 'react'
import { Receipt, Settings, AlertCircle, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useAccount } from '../contexts/AccountContext'
import type { DbTaxProfile, DbTrade, DbAccount, AssetClassIncome } from '../types'
import {
  computeTaxEstimate,
  computeAssetClassIncomeFromTrades,
  applyProfileOverrides,
} from '../lib/tax-engine'
import TaxDashboardCards from '../components/tax/TaxDashboardCards'
import TaxBreakdownTable from '../components/tax/TaxBreakdownTable'
import TaxCharts from '../components/tax/TaxCharts'
import TaxProfileForm from '../components/tax/TaxProfileForm'

type Tab = 'overview' | 'profile'

const EMPTY_ASSET_INCOME: AssetClassIncome = {
  futures: 0, stocks: 0, options: 0, crypto: 0, forex: 0,
}

const DEFAULT_PROFILE: Omit<DbTaxProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  filing_status:             'single',
  state:                     'TX',
  w2_income:                 0,
  other_ordinary_income:     0,
  deduction_method:          'standard',
  itemized_deduction_amount: 0,
  reserve_mode:              'recommended',
  tax_payments_made:         0,
  tax_savings_balance:       0,
  qualifying_children:       0,
  other_dependents:          0,
  futures_profit_override:   null,
  stocks_profit_override:    null,
  options_profit_override:   null,
  crypto_profit_override:    null,
  forex_profit_override:     null,
}

export default function TaxPage() {
  const { user } = useAuth()
  const { accounts } = useAccount()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [profile, setProfile]  = useState<DbTaxProfile | null>(null)
  const [ytdTrades, setYtdTrades] = useState<DbTrade[]>([])
  const [allAccounts, setAllAccounts] = useState<DbAccount[]>([])
  const [loading, setLoading]  = useState(true)
  const [saving, setSaving]    = useState(false)

  // ── Load data ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    void loadData()
  }, [user])

  // Refresh when accounts change (account list determines product_type lookup)
  useEffect(() => {
    setAllAccounts(accounts)
  }, [accounts])

  async function loadData() {
    setLoading(true)
    try {
      const currentYear = new Date().getFullYear()
      const yearStart   = `${currentYear}-01-01`
      const yearEnd     = `${currentYear}-12-31`

      const [profileRes, tradesRes, accountsRes] = await Promise.all([
        supabase
          .from('tax_profiles')
          .select('*')
          .eq('user_id', user!.id)
          .maybeSingle(),
        supabase
          .from('trades')
          .select('*')
          .eq('user_id', user!.id)
          .gte('trade_date', yearStart)
          .lte('trade_date', yearEnd),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user!.id),
      ])

      if (profileRes.error) throw profileRes.error
      if (tradesRes.error)  throw tradesRes.error
      if (accountsRes.error) throw accountsRes.error

      setProfile(profileRes.data as DbTaxProfile | null)
      setYtdTrades((tradesRes.data ?? []) as DbTrade[])
      setAllAccounts((accountsRes.data ?? []) as DbAccount[])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load tax data')
    } finally {
      setLoading(false)
    }
  }

  // ── Save profile ─────────────────────────────────────────────────────────────

  async function handleSave(data: Omit<DbTaxProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    setSaving(true)
    try {
      const payload = { ...data, user_id: user!.id, updated_at: new Date().toISOString() }

      if (profile) {
        const { data: updated, error } = await supabase
          .from('tax_profiles')
          .update(payload)
          .eq('id', profile.id)
          .eq('user_id', user!.id)
          .select()
          .single()
        if (error) throw error
        setProfile(updated as DbTaxProfile)
      } else {
        const { data: inserted, error } = await supabase
          .from('tax_profiles')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        setProfile(inserted as DbTaxProfile)
      }

      toast.success('Tax profile saved!')
      setActiveTab('overview')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save tax profile')
    } finally {
      setSaving(false)
    }
  }

  // ── Compute values ───────────────────────────────────────────────────────────

  const liveAccountIds = useMemo(
    () => new Set(allAccounts.filter(a => a.account_type === 'live').map(a => a.id)),
    [allAccounts],
  )

  const autoAssetIncome = useMemo(
    () => computeAssetClassIncomeFromTrades(ytdTrades, allAccounts),
    [ytdTrades, allAccounts],
  )

  const effectiveProfile = profile ?? { ...DEFAULT_PROFILE, id: '', user_id: '', created_at: '', updated_at: '' }

  const assetIncome = useMemo(
    () => applyProfileOverrides(autoAssetIncome, effectiveProfile),
    [autoAssetIncome, effectiveProfile],
  )

  const taxResult = useMemo(() => computeTaxEstimate({
    taxYear:                new Date().getFullYear(),
    filingStatus:           effectiveProfile.filing_status,
    state:                  effectiveProfile.state,
    w2Income:               effectiveProfile.w2_income,
    otherOrdinaryIncome:    effectiveProfile.other_ordinary_income,
    deductionMethod:        effectiveProfile.deduction_method,
    itemizedDeductionAmount:effectiveProfile.itemized_deduction_amount,
    reserveMode:            effectiveProfile.reserve_mode,
    taxPaymentsMade:        effectiveProfile.tax_payments_made,
    taxSavingsBalance:      effectiveProfile.tax_savings_balance,
    qualifyingChildren:     effectiveProfile.qualifying_children,
    otherDependents:        effectiveProfile.other_dependents,
    assetIncome,
  }), [effectiveProfile, assetIncome])

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    )
  }

  const totalTradingYTD =
    assetIncome.futures + assetIncome.stocks + assetIncome.options + assetIncome.crypto + assetIncome.forex
  const hasTrading = totalTradingYTD !== 0
  const hasProfile = profile !== null

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary font-semibold text-xl">Tax Reserve Tracker</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Estimate your tax liability and track how much to keep in reserve
          </p>
        </div>
        <div className="text-right">
          <div className="text-text-dim text-xs">Tax Year</div>
          <div className="text-text-primary font-semibold text-lg tabular-nums">
            {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* ── Profile setup prompt ──────────────────────────────────────────── */}
      {!hasProfile && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-accent/5 border border-accent/20 rounded-xl">
          <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-text-primary text-sm font-medium">Set up your Tax Profile</p>
            <p className="text-text-muted text-xs mt-0.5">
              Enter your filing status, income, and state to get accurate tax estimates.
              The overview below uses default settings until you save a profile.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('profile')}
            className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-all whitespace-nowrap"
          >
            Set Up Profile
          </button>
        </div>
      )}

      {/* ── Live accounts notice ─────────────────────────────────────────── */}
      {allAccounts.length > 0 && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 bg-hover border border-border rounded-xl">
          <Info className="w-3.5 h-3.5 text-text-muted flex-shrink-0 mt-0.5" />
          <p className="text-text-muted text-xs leading-relaxed">
            <span className="text-text-primary font-medium">Only live accounts are included. </span>
            Paper and demo account P&L is excluded — it is not taxable.
            {liveAccountIds.size === 0
              ? ' No live accounts found — set an account type to "Live" on the Accounts page, or enter manual overrides in Tax Profile.'
              : ` Counting trades from ${liveAccountIds.size} live account${liveAccountIds.size !== 1 ? 's' : ''}.`}
          </p>
        </div>
      )}

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 bg-hover border border-border rounded-xl">
        <AlertCircle className="w-3.5 h-3.5 text-text-dim flex-shrink-0 mt-0.5" />
        <p className="text-text-dim text-xs leading-relaxed">
          This is an estimate only — not tax advice. Consult a tax professional for your actual filing.
          Uses {new Date().getFullYear()} IRS bracket tables. NIIT (3.8%) applied where applicable.
        </p>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
        {([
          { key: 'overview' as Tab, label: 'Overview', icon: Receipt },
          { key: 'profile'  as Tab, label: 'Tax Profile', icon: Settings },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === key
                ? 'bg-accent/15 text-accent border border-accent/20'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <TaxDashboardCards result={taxResult} />

          {!hasTrading && (
            <div className="flex items-start gap-3 px-4 py-3.5 bg-hover border border-border rounded-xl">
              <Info className="w-4 h-4 text-text-dim flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-text-muted text-sm font-medium">No trading income detected for {new Date().getFullYear()}</p>
                <p className="text-text-dim text-xs mt-0.5">
                  Import trades for this year, or enter manual overrides in the Tax Profile tab.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TaxBreakdownTable result={taxResult} />
            <TaxCharts result={taxResult} />
          </div>
        </div>
      )}

      {/* ── Profile tab ──────────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <TaxProfileForm
          profile={profile}
          autoAssetIncome={autoAssetIncome}
          saving={saving}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
