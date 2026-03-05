import { useState } from 'react'
import { TrendingUp, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'signin' | 'signup' | 'forgot'

export default function AuthPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        toast.success('Welcome back!')
      } else if (mode === 'signup') {
        await signUp(email, password)
        toast.success('Account created! Check your email to confirm.')
      } else {
        await resetPassword(email)
        toast.success('Reset link sent — check your inbox.')
        setMode('signin')
      }
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-deep flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 bg-gradient-to-br from-base to-surface border-r border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-accent" />
          </div>
          <span className="text-text-primary font-semibold text-lg tracking-tight">Track The Trades</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-text-primary leading-tight mb-4">
            Your trading journal,<br />
            <span className="text-accent">built for performance.</span>
          </h1>
          <p className="text-text-muted text-lg leading-relaxed">
            Import your TradingView order history and instantly see your win rate,
            P&amp;L curves, daily stats, and more — all in one clean dashboard.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Win Rate', value: '68.4%', color: 'text-profit' },
            { label: 'Net P&L', value: '+$12,840', color: 'text-profit' },
            { label: 'Profit Factor', value: '2.14', color: 'text-accent' },
          ].map(stat => (
            <div key={stat.label} className="bg-base/60 rounded-xl p-4 border border-border">
              <div className={`font-mono text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-text-muted text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-accent" />
            </div>
            <span className="text-text-primary font-semibold">Track The Trades</span>
          </div>

          <h2 className="text-2xl font-bold text-text-primary mb-1">
            {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}
          </h2>
          <p className="text-text-muted mb-8 text-sm">
            {mode === 'signin' ? "Don't have an account? " : mode === 'signup' ? 'Already have an account? ' : 'Remembered it? '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-accent hover:text-accent/80 font-medium transition-colors"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-text-muted text-sm mb-1.5 font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-surface border border-border rounded-lg px-3.5 py-2.5 text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all text-sm"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-text-muted text-sm mb-1.5 font-medium">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-surface border border-border rounded-lg px-3.5 py-2.5 pr-10 text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-muted transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-text-dim hover:text-text-muted text-xs mt-1.5 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-4 py-2.5 transition-all text-sm mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
