import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export function useRealtime() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!householdId) return

    const channel = supabase
      .channel(`household:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['groceries', householdId] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_members',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['household-members', householdId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [householdId, queryClient])
}
