import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { HouseholdCategory, StoreCategoryOrder } from '@/types'

export function useHouseholdCategories() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['household-categories', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_categories')
        .select('*')
        .eq('household_id', householdId!)
        .order('sort_order')
        .order('name')
      if (error) throw error
      return (data ?? []) as HouseholdCategory[]
    },
    enabled: !!householdId,
  })
}

export function useAddHouseholdCategory() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, sortOrder }: { name: string; sortOrder?: number }) => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Kategori saknas')
      const { data, error } = await supabase
        .from('household_categories')
        .insert([{ household_id: householdId!, name: trimmed, sort_order: sortOrder ?? 0 }])
        .select()
        .single()
      if (error) throw error
      return data as HouseholdCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household-categories', householdId] })
    },
  })
}

export function useDeleteHouseholdCategory() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('household_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household-categories', householdId] })
    },
  })
}

export function useStoreCategoryOrders(storeId: string | null) {
  return useQuery({
    queryKey: ['store-category-orders', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_category_orders')
        .select('*')
        .eq('store_id', storeId!)
        .order('position')
        .order('category_name')
      if (error) throw error
      return (data ?? []) as StoreCategoryOrder[]
    },
    enabled: !!storeId,
  })
}

export function useSetStoreCategoryOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ storeId, orderedCategoryNames }: { storeId: string; orderedCategoryNames: string[] }) => {
      const rows = orderedCategoryNames.map((name, idx) => ({
        store_id: storeId,
        category_name: name,
        position: idx,
      }))
      const { error } = await supabase
        .from('store_category_orders')
        .upsert(rows, { onConflict: 'store_id,category_name' })
      if (error) throw error
    },
    onSuccess: (_data, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: ['store-category-orders', storeId] })
    },
  })
}

