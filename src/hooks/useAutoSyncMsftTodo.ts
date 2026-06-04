import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useMsftTodoConnection } from '@/hooks/useMsftTodo'

const AUTO_SYNC_COOLDOWN_MS = 5 * 60 * 1000

// Fires the msft-todo sync action when the app loads, throttled to once
// per AUTO_SYNC_COOLDOWN_MS by the server's last_synced_at. Reloading the
// tab a minute later will see a fresh timestamp and skip; coming back
// after a coffee break will sync. The pg_cron job covers the rest.
//
// Silent on failure — manual "Synka nu" and the cron stay authoritative.
export function useAutoSyncMsftTodo() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()
  const { data: connection } = useMsftTodoConnection()
  const firedRef = useRef(false)

  useEffect(() => {
    if (!householdId || !connection?.list_id) return
    if (firedRef.current) return

    const lastSyncMs = connection.last_synced_at
      ? new Date(connection.last_synced_at).getTime()
      : 0
    if (Date.now() - lastSyncMs < AUTO_SYNC_COOLDOWN_MS) return

    firedRef.current = true
    let cancelled = false

    ;(async () => {
      try {
        const { error } = await supabase.functions.invoke('msft-todo', {
          body: { action: 'sync' },
        })
        if (cancelled) return
        if (error) {
          firedRef.current = false
          return
        }
        queryClient.invalidateQueries({ queryKey: ['groceries', householdId] })
        queryClient.invalidateQueries({ queryKey: ['msft-todo-connection', householdId] })
      } catch {
        firedRef.current = false
      }
    })()

    return () => { cancelled = true }
  }, [householdId, connection?.list_id, connection?.last_synced_at, queryClient])
}
