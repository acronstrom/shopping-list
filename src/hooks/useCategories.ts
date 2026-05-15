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

export function useAddStoreCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ storeId, name }: { storeId: string; name: string }) => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Kategori saknas')

      const { data: existing, error: existingErr } = await supabase
        .from('store_category_orders')
        .select('position')
        .eq('store_id', storeId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (existingErr) throw existingErr
      const nextPosition = (existing?.position ?? -1) + 1

      const { error } = await supabase
        .from('store_category_orders')
        .insert([{ store_id: storeId, category_name: trimmed, position: nextPosition }])
      if (error) {
        if (error.code === '23505') throw new Error('Kategorin finns redan i butiken.')
        throw error
      }
    },
    onSettled: (_data, _err, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: ['store-category-orders', storeId] })
    },
  })
}

export function useRemoveStoreCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ storeId, name }: { storeId: string; name: string }) => {
      const { error } = await supabase
        .from('store_category_orders')
        .delete()
        .eq('store_id', storeId)
        .eq('category_name', name)
      if (error) throw error
    },
    onMutate: async ({ storeId, name }) => {
      await queryClient.cancelQueries({ queryKey: ['store-category-orders', storeId] })
      const prev = queryClient.getQueryData<StoreCategoryOrder[]>(['store-category-orders', storeId])
      queryClient.setQueryData<StoreCategoryOrder[]>(
        ['store-category-orders', storeId],
        old => (old ?? []).filter(r => r.category_name !== name)
      )
      return { prev }
    },
    onError: (_err, { storeId }, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['store-category-orders', storeId], ctx.prev)
    },
    onSettled: (_data, _err, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: ['store-category-orders', storeId] })
    },
  })
}

export function useResetStoreCategoriesToHousehold() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (storeId: string) => {
      const { data: defaults, error: defaultsErr } = await supabase
        .from('household_categories')
        .select('name, sort_order')
        .eq('household_id', householdId!)
        .order('sort_order')
        .order('name')
      if (defaultsErr) throw defaultsErr

      const { error: delErr } = await supabase
        .from('store_category_orders')
        .delete()
        .eq('store_id', storeId)
      if (delErr) throw delErr

      if ((defaults ?? []).length > 0) {
        const rows = (defaults ?? []).map((c, i) => ({
          store_id: storeId,
          category_name: c.name,
          position: i,
        }))
        const { error: insErr } = await supabase.from('store_category_orders').insert(rows)
        if (insErr) throw insErr
      }
    },
    onSettled: (_data, _err, storeId) => {
      queryClient.invalidateQueries({ queryKey: ['store-category-orders', storeId] })
    },
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
    onMutate: async ({ storeId, orderedCategoryNames }) => {
      await queryClient.cancelQueries({ queryKey: ['store-category-orders', storeId] })
      const prev = queryClient.getQueryData<StoreCategoryOrder[]>(['store-category-orders', storeId])
      const byName = new Map((prev ?? []).map(r => [r.category_name, r]))
      const optimistic: StoreCategoryOrder[] = orderedCategoryNames.map((name, idx) => {
        const existing = byName.get(name)
        return existing
          ? { ...existing, position: idx }
          : {
              id: `tmp-${storeId}-${name}`,
              store_id: storeId,
              category_name: name,
              position: idx,
              updated_at: new Date().toISOString(),
            }
      })
      queryClient.setQueryData(['store-category-orders', storeId], optimistic)
      return { prev }
    },
    onError: (_err, { storeId }, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['store-category-orders', storeId], ctx.prev)
    },
    onSettled: (_data, _err, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: ['store-category-orders', storeId] })
    },
  })
}

