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

export function useReorderHouseholdCategories() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const cached =
        queryClient.getQueryData<HouseholdCategory[]>(['household-categories', householdId]) ?? []
      const byId = new Map(cached.map(c => [c.id, c]))
      const rows = orderedIds.map((id, idx) => {
        const existing = byId.get(id)
        if (!existing) throw new Error('Kategori saknas i cache')
        return {
          id,
          household_id: existing.household_id,
          name: existing.name,
          sort_order: (idx + 1) * 10,
        }
      })
      const { error } = await supabase
        .from('household_categories')
        .upsert(rows, { onConflict: 'id' })
      if (error) throw error
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: ['household-categories', householdId] })
      const prev = queryClient.getQueryData<HouseholdCategory[]>(['household-categories', householdId])
      if (prev) {
        const byId = new Map(prev.map(c => [c.id, c]))
        const next = orderedIds
          .map((id, idx) => {
            const existing = byId.get(id)
            return existing ? { ...existing, sort_order: (idx + 1) * 10 } : null
          })
          .filter((c): c is HouseholdCategory => c !== null)
        queryClient.setQueryData(['household-categories', householdId], next)
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['household-categories', householdId], ctx.prev)
    },
    onSettled: () => {
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

