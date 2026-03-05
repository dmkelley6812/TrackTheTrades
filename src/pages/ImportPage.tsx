import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { FileText, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { DbImport } from '../types'
import ImportWizard from '../components/import/ImportWizard'

export default function ImportPage() {
  const { user } = useAuth()
  const [imports, setImports] = useState<DbImport[]>([])
  const [loadingImports, setLoadingImports] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  function fetchImports() {
    if (!user) return
    supabase
      .from('imports')
      .select('*')
      .eq('user_id', user.id)
      .order('imported_at', { ascending: false })
      .then(({ data }) => {
        setImports(data ?? [])
        setLoadingImports(false)
      })
  }

  useEffect(() => {
    fetchImports()
  }, [user])

  async function deleteImport(imp: DbImport) {
    if (!confirm(`Delete import "${imp.file_name}"? This will also remove all associated trades and orders.`)) return
    setDeleting(imp.id)
    try {
      // Cascade deletes handle orders and trades via import_id FK (SET NULL),
      // so we need to explicitly delete trades/orders linked to this import
      await supabase.from('trades').delete().eq('import_id', imp.id)
      await supabase.from('orders').delete().eq('import_id', imp.id)
      const { error } = await supabase.from('imports').delete().eq('id', imp.id)
      if (error) throw error
      setImports(prev => prev.filter(i => i.id !== imp.id))
      toast.success('Import deleted')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-text-primary text-xl font-bold">Import Trades</h1>
        <p className="text-text-muted text-sm mt-0.5">Upload your TradingView order history CSV</p>
      </div>

      <ImportWizard key={imports.length} onImportComplete={fetchImports} />

      {/* Import history */}
      <div>
        <h2 className="text-text-primary font-semibold text-sm mb-3">Import History</h2>
        {loadingImports ? (
          <div className="flex items-center gap-2 text-text-dim text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : imports.length === 0 ? (
          <p className="text-text-dim text-sm">No imports yet.</p>
        ) : (
          <div className="space-y-2">
            {imports.map(imp => (
              <div key={imp.id} className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{imp.file_name}</p>
                  <p className="text-text-dim text-xs mt-0.5">
                    {imp.broker} · {imp.trade_count} trade{imp.trade_count !== 1 ? 's' : ''} · {format(new Date(imp.imported_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <button
                  onClick={() => deleteImport(imp)}
                  disabled={deleting === imp.id}
                  className="w-7 h-7 rounded-lg hover:bg-loss/10 flex items-center justify-center text-text-dim hover:text-loss transition-all disabled:opacity-40"
                  title="Delete import"
                >
                  {deleting === imp.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {imports.length > 0 && (
        <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
          <p className="text-text-dim text-xs">
            Deleting an import permanently removes all trades and orders associated with it. This cannot be undone.
          </p>
        </div>
      )}
    </div>
  )
}
