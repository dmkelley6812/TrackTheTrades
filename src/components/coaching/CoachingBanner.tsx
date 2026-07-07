import { useState } from 'react'
import {
  AlertTriangle, TrendingDown, ShieldAlert, Settings2, X, MoreHorizontal, CheckCircle2,
} from 'lucide-react'
import type { CoachingCue, CoachingCueType, DbCoachingSettings } from '../../types'
import CoachingSettingsPanel from './CoachingSettingsPanel'

const CUE_ICON: Record<CoachingCueType, React.ComponentType<{ className?: string }>> = {
  large_loss: AlertTriangle,
  loss_streak: TrendingDown,
  daily_loss: ShieldAlert,
}

const CUE_SETTINGS_KEY: Record<CoachingCueType, keyof DbCoachingSettings> = {
  large_loss: 'large_loss_enabled',
  loss_streak: 'loss_streak_enabled',
  daily_loss: 'daily_loss_enabled',
}

interface CueCardProps {
  cue: CoachingCue
  onDismiss: (cueId: string) => void
  onDisableType: (type: CoachingCueType) => void
}

function CueCard({ cue, onDismiss, onDisableType }: CueCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const Icon = CUE_ICON[cue.type]

  return (
    <div className="flex items-start gap-3 bg-amber-400/5 border border-amber-400/20 rounded-xl px-4 py-3">
      <div className="w-8 h-8 rounded-lg bg-amber-400/15 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary text-sm font-semibold">{cue.title}</p>
        <p className="text-text-muted text-xs mt-0.5 leading-relaxed">{cue.message}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="relative">
          <button
            onClick={() => setMenuOpen(v => !v)}
            onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
            className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-text-primary hover:bg-hover transition-colors"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 w-52 bg-base border border-border rounded-lg shadow-2xl z-20 overflow-hidden">
              <button
                onMouseDown={() => onDisableType(cue.type)}
                className="w-full px-3 py-2 text-left text-sm text-text-muted hover:text-text-primary hover:bg-hover transition-colors"
              >
                Turn off this coaching type
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => onDismiss(cue.id)}
          className="w-6 h-6 rounded flex items-center justify-center text-text-dim hover:text-text-primary hover:bg-hover transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

interface Props {
  cues: CoachingCue[]
  onDismiss: (cueId: string) => void
  settings: DbCoachingSettings
  onUpdateSettings: (partial: Partial<DbCoachingSettings>) => void
}

export default function CoachingBanner({ cues, onDismiss, settings, onUpdateSettings }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  function disableType(type: CoachingCueType) {
    onUpdateSettings({ [CUE_SETTINGS_KEY[type]]: false })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <div className="relative">
          <button
            onClick={() => setSettingsOpen(v => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-text-primary hover:bg-hover transition-colors"
            title="Coaching settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
          {settingsOpen && (
            <CoachingSettingsPanel
              settings={settings}
              onUpdate={onUpdateSettings}
              onClose={() => setSettingsOpen(false)}
            />
          )}
        </div>
      </div>

      {cues.length > 0 ? (
        <div className="space-y-2">
          {cues.map(cue => (
            <CueCard key={cue.id} cue={cue} onDismiss={onDismiss} onDisableType={disableType} />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2.5 bg-surface border border-border rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-profit flex-shrink-0" />
          <p className="text-text-muted text-sm">No coaching alerts right now.</p>
        </div>
      )}
    </div>
  )
}
