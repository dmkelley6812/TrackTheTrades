import { NavLink } from 'react-router-dom'
import { TrendingUp, LayoutDashboard, List, Upload, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/trades', icon: List, label: 'Trades' },
  { to: '/import', icon: Upload, label: 'Import' },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      toast.error('Failed to sign out')
    }
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
