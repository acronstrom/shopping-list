import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// Auto-syncs the household's Microsoft To Do connection once per browser
// session right after the user is signed in and the household is loaded.
// Silent on failure — manual "Synka nu" and the pg_cron job remain the
// authoritative paths. A sessionStorage marker prevents repeat fires
// when the AppShell unmounts/remounts in the same tab.
export function useAutoSyncMsftTodo() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!householdId) return

    const markerKey = `msft-todo:autosync-ran:${householdId}`
    if (sessionStorage.getItem(markerKey)) return

    let cancelled = false

    ;(async () => {
      const { data: connection, error: connErr } = await supabase
        .from('household_msft_todo_connections')
        .select('id, list_id')
        .eq('household_id', householdId)
        .maybeSingle()
      if (cancelled || connErr || !connection?.list_id) return

      // Mark BEFORE the invoke so a slow-running sync doesn't fire twice
      // if the effect re-runs (StrictMode double-invoke in dev, fast nav, …).
      sessionStorage.setItem(markerKey, '1')

      try {
        const { error: syncErr } = await supabase.functions.invoke('msft-todo', {
          body: { action: 'sync' },
        })
        if (cancelled) return
        if (syncErr) {
          sessionStorage.removeItem(markerKey)
          return
        }
        queryClient.invalidateQueries({ queryKey: ['groceries', householdId] })
        queryClient.invalidateQueries({ queryKey: ['msft-todo-connection', householdId] })
      } catch {
        sessionStorage.removeItem(markerKey)
      }
    })()

    return () => { cancelled = true }
  }, [householdId, queryClient])
}
