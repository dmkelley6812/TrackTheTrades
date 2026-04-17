import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    return res
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

export default function StatusBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const check = async () => {
      // Check 1: Supabase status page API
      try {
        const res = await fetchWithTimeout('https://status.supabase.com/api/v2/status.json', 5000)
        if (res.ok) {
          const data = await res.json()
          const indicator = data?.status?.indicator
          if (indicator && indicator !== 'none') {
            setShow(true)
            return
          }
        }
      } catch {
        // CORS or network error — fall through to ping check
      }

      // Check 2: Direct ping to Supabase project (catches outages before status page updates)
      try {
        await fetchWithTimeout(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, 5000)
      } catch {
        setShow(true)
      }
    }
    check()
  }, [])

  if (!show) return null

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-3 flex items-center gap-2 text-yellow-400 text-sm w-full">
      <AlertTriangle size={15} className="shrink-0" />
      <span>We are aware of a system outage that may impact site functionality. We apologize for any inconvenience.</span>
    </div>
  )
}
