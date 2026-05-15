import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export function useClearPurchaseHistory() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('purchase_history')
        .delete()
        .eq('household_id', householdId!)
      if (error) throw error
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['purchase-history', householdId] })
      const prev = queryClient.getQueryData<PurchaseHistory[]>(['purchase-history', householdId])
      queryClient.setQueryData<PurchaseHistory[]>(['purchase-history', householdId], [])
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['purchase-history', householdId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-history', householdId] })
      queryClient.invalidateQueries({ queryKey: ['suggestions', householdId] })
    },
  })
}

export function useDeletePurchaseHistoryItem() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('purchase_history')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['purchase-history', householdId] })
      const prev = queryClient.getQueryData<PurchaseHistory[]>(['purchase-history', householdId])
      queryClient.setQueryData<PurchaseHistory[]>(
        ['purchase-history', householdId],
        old => (old ?? []).filter(r => r.id !== id)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['purchase-history', householdId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-history', householdId] })
      queryClient.invalidateQueries({ queryKey: ['suggestions', householdId] })
    },
  })
}

export interface FrequentItem {
  name: string
  count: number
}

export function useFrequentlyBoughtNames({
  minCount = 2,
  limit = 30,
}: { minCount?: number; limit?: number } = {}) {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['frequently-bought', householdId, minCount, limit],
    queryFn: async (): Promise<FrequentItem[]> => {
      const { data, error } = await supabase
        .from('purchase_history')
        .select('item_name')
        .eq('household_id', householdId!)
        .order('purchased_at', { ascending: false })
        .limit(500)
      if (error) throw error

      const counts = new Map<string, number>()
      for (const row of (data ?? []) as Array<{ item_name: string }>) {
        const key = row.item_name.toLowerCase().trim()
        if (!key) continue
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }

      return Array.from(counts.entries())
        .filter(([, count]) => count >= minCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }))
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
