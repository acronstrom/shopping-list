import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { PurchaseHistory, Suggestion } from '@/types'

export function usePurchaseHistory() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['purchase-history', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_history')
        .select('*')
        .eq('household_id', householdId!)
        .order('purchased_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return (data ?? []) as PurchaseHistory[]
    },
    enabled: !!householdId,
  })
}

export function useSuggestions(currentItemNames: string[]) {
  const { householdId } = useAuth()
  const currentSet = new Set(currentItemNames.map(n => n.toLowerCase().trim()))

  return useQuery({
    queryKey: ['suggestions', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_history')
        .select('item_name, category')
        .eq('household_id', householdId!)
        .order('purchased_at', { ascending: false })
        .limit(500)
      if (error) throw error

      const counts = new Map<string, { count: number; category: string | null }>()
      for (const row of (data ?? []) as Array<{ item_name: string; category: string | null }>) {
        const key = row.item_name
        const existing = counts.get(key)
        if (existing) {
          existing.count++
        } else {
          counts.set(key, { count: 1, category: row.category })
        }
      }

      return Array.from(counts.entries())
        .map(([item_name, { count, category }]): Suggestion => ({ item_name, category, count }))
        .filter(s => !currentSet.has(s.item_name))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    },
    enabled: !!householdId,
  })
}
