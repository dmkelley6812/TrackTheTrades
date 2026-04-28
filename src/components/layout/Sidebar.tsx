import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  TrendingUp, LayoutDashboard, List, Upload, LogOut,
  ChevronRight, Flag, ChevronDown, Plus, Settings2, Trophy,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useAccount } from '../../contexts/AccountContext'
import type { DbAccount } from '../../types'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trades', icon: List, label: 'Trades' },
  { to: '/goals', icon: Flag, label: 'Goals' },
  { to: '/badges', icon: Trophy, label: 'Badges' },
  { to: '/import', icon: Upload, label: 'Import' },
]

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  paper: 'Paper',
  live: 'Live',
  demo: 'Demo',
}

const ACCOUNT_TYPE_COLOR: Record<string, string> = {
  paper: 'text-accent bg-accent/10',
  live: 'text-profit bg-profit/10',
  demo: 'text-text-muted bg-surface',
}

function AccountDot({ color }: { color: string }) {
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
}

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const { accounts, activeAccount, setActiveAccount, loading } = useAccount()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      toast.error('Failed to sign out')
    }
  }

  function handleSelectAccount(account: DbAccount) {
    setActiveAccount(account)
    setOpen(false)
  }

  function handleManageAccounts() {
    setOpen(false)
    navigate('/accounts')
  }

  function handleNewAccount() {
    setOpen(false)
    navigate('/accounts?new=1')
  }

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-base border-r border-border flex flex-col z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-7 h-7 rounded-md bg-accent/20 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-accent" />
        </div>
        <span className="font-semibold text-text-primary text-sm tracking-tight leading-tight">
          Track The Trades
        </span>
      </div>

      {/* Account switcher */}
      <div className="px-3 py-3 border-b border-border" ref={dropdownRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface hover:bg-hover border border-border transition-all group"
          disabled={loading}
        >
          {activeAccount ? (
            <>
              <AccountDot color={activeAccount.color} />
              <div className="flex-1 text-left min-w-0">
                <p className="text-text-primary text-xs font-medium truncate">{activeAccount.name}</p>
                <p className="text-text-dim text-[10px] truncate">
                  {ACCOUNT_TYPE_LABEL[activeAccount.account_type]} · {activeAccount.product_type}
                </p>
              </div>
            </>
          ) : (
            <span className="text-text-dim text-xs flex-1 text-left">No account</span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-text-dim flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-3 right-3 mt-1 bg-base border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            {/* Account list */}
            <div className="max-h-48 overflow-y-auto py-1">
              {accounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => handleSelectAccount(account)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-hover transition-colors ${
                    activeAccount?.id === account.id ? 'bg-accent/10' : ''
                  }`}
                >
                  <AccountDot color={account.color} />
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-xs font-medium truncate">{account.name}</p>
                    <p className="text-text-dim text-[10px]">
                      {ACCOUNT_TYPE_LABEL[account.account_type]} · {account.product_type}
                    </p>
                  </div>
                  {activeAccount?.id === account.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-border py-1">
              <button
                onClick={handleNewAccount}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-text-muted hover:text-text-primary hover:bg-hover text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New account
              </button>
              <button
                onClick={handleManageAccounts}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-text-muted hover:text-text-primary hover:bg-hover text-xs transition-colors"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Manage accounts
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-accent/15 text-accent border border-accent/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-hover'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-accent' : 'text-text-dim group-hover:text-text-muted'}`} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-accent/60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface mb-1">
          <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center flex-shrink-0">
            <span className="text-accent text-xs font-semibold">
              {user?.email?.[0]?.toUpperCase() ?? 'T'}
            </span>
          </div>
          <span className="text-text-muted text-xs truncate flex-1">{user?.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-text-dim hover:text-loss hover:bg-loss/5 text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
