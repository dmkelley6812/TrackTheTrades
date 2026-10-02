import { useState } from 'react'
import toast from 'react-hot-toast'
import { Lock } from 'lucide-react'
import { useProgression } from '../../contexts/ProgressionContext'
import { PROFILE_EMBLEMS, isEmblemUnlocked } from '../../lib/progression'
import { ICON_MAP } from './BadgeCard'
import { supabase } from '../../lib/supabase'

export function ProfileAvatar() {
  const { emblemId } = useProgression()
  const emblem = PROFILE_EMBLEMS.find(e => e.id === emblemId) ?? PROFILE_EMBLEMS[0]
  const Icon = ICON_MAP[emblem.icon]
  return <span title={emblem.title} className="w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0" style={{ color: emblem.color, borderColor: emblem.color, background: `${emblem.color}15`, boxShadow: `0 0 12px ${emblem.color}30` }}><Icon className="w-5 h-5" /></span>
}
export default function ProfileEmblems() {
  const { progression: p, emblemId, loading, error } = useProgression()
  const [saving, setSaving] = useState(false)
  async function equip(id: string) {
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ data: { profile_emblem: id } })
    setSaving(false)
    if (error) toast.error('Could not save profile emblem')
    else { window.dispatchEvent(new Event('ttt_progression_changed')); toast.success('Profile emblem equipped') }
  }
  if (loading) return <p className="text-text-muted">Loading profile rewards…</p>
  return <section className="space-y-4">
    <h2 className="text-text-primary font-bold">Profile emblems</h2>
    {error && <p role="status" className="text-amber-400 text-sm">{error}</p>}
    <p className="text-text-muted text-sm">Equip an unlocked emblem beside your profile. XP and trading qualifications use the selected account; app visit days follow your profile.</p>
    <div className="grid sm:grid-cols-3 gap-3">{PROFILE_EMBLEMS.map(e => {
      const unlocked = isEmblemUnlocked(e, p)
      const Icon = ICON_MAP[e.icon]
      return <button key={e.id} disabled={!unlocked || saving} onClick={() => equip(e.id)} aria-pressed={emblemId === e.id} className={`rounded-xl border p-4 text-left disabled:cursor-default ${emblemId === e.id ? 'border-accent bg-accent/10' : 'border-border bg-surface'}`}>
        <div className="flex items-center gap-3"><Icon className="w-8 h-8" style={{ color: unlocked ? e.color : '#64748b' }} /><span className="text-text-primary font-semibold">{e.title}</span>{!unlocked && <Lock className="w-4 h-4 text-text-dim ml-auto" />}</div>
        <p className="text-text-muted text-xs mt-3">{e.requirement}</p>
        <p className="text-accent text-xs mt-2">{emblemId === e.id ? 'Equipped' : unlocked ? 'Equip emblem' : `${Math.max(0, e.xp - p.totalXp).toLocaleString()} XP remaining · meet all requirements`}</p>
      </button>
    })}</div>
    <details className="text-text-muted text-sm rounded-xl border border-border p-4"><summary className="cursor-pointer font-semibold text-text-primary">How XP works · {p.totalXp.toLocaleString()} total XP</summary>
      <ul className="mt-3 space-y-2">
        <li>Logging: {p.logging.toLocaleString()} XP. 50 per distinct trading day + 10 per trade, capped at 10 trades per day.</li>
        <li>Achievements: {p.achievements.toLocaleString()} XP. Common 100, rare 300, epic 750, legendary 1,500; each badge counts once, including previously earned streaks.</li>
        <li>Profitability: {p.profitability.toLocaleString()} XP. Cumulative net profit tiers at $100, $1K, $5K, $10K, $25K, $50K, $100K, $250K, $500K and $1M award 250 to 2,500 XP.</li>
        <li>Volume: {p.volume.toLocaleString()} XP. 250 at each of $100K, $1M, $10M, $100M and $1B in contract-adjusted entry + exit notional. Volume rewards cap at 1,250 XP.</li>
        <li>App loyalty: {p.loyalty.toLocaleString()} XP. 25 per distinct UTC app visit day, starting when visit tracking is enabled. Refreshes and repeated logins count once.</li>
      </ul>
      <p className="mt-3">Existing history counts automatically. Reimporting duplicates adds no XP. Trade-derived XP and emblem eligibility adjust when history or net profit changes. These rewards reflect your journal, including paper trades; they do not verify trading skill.</p>
    </details>
  </section>
}
