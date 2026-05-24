import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { HouseholdRecipeCategory } from '@/types'

const QUERY_KEY = 'household-recipe-categories'

export function useHouseholdRecipeCategories() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: [QUERY_KEY, householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_recipe_categories')
        .select('*')
        .eq('household_id', householdId!)
        .order('sort_order')
        .order('name')
      if (error) throw error
      return (data ?? []) as HouseholdRecipeCategory[]
    },
    enabled: !!householdId,
  })
}

export function useAddHouseholdRecipeCategory() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, sortOrder }: { name: string; sortOrder?: number }) => {
      const trimmed = name.trim()
      if (!trimmed) throw new Error('Kategori saknas')
      const { data, error } = await supabase
        .from('household_recipe_categories')
        .insert([{ household_id: householdId!, name: trimmed, sort_order: sortOrder ?? 0 }])
        .select()
        .single()
      if (error) {
        if (error.code === '23505') throw new Error('Kategorin finns redan.')
        throw error
      }
      return data as HouseholdRecipeCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, householdId] })
    },
  })
}

export function useReorderHouseholdRecipeCategories() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const cached =
        queryClient.getQueryData<HouseholdRecipeCategory[]>([QUERY_KEY, householdId]) ?? []
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
        .from('household_recipe_categories')
        .upsert(rows, { onConflict: 'id' })
      if (error) throw error
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: [QUERY_KEY, householdId] })
      const prev = queryClient.getQueryData<HouseholdRecipeCategory[]>([QUERY_KEY, householdId])
      if (prev) {
        const byId = new Map(prev.map(c => [c.id, c]))
        const next = orderedIds
          .map((id, idx) => {
            const existing = byId.get(id)
            return existing ? { ...existing, sort_order: (idx + 1) * 10 } : null
          })
          .filter((c): c is HouseholdRecipeCategory => c !== null)
        queryClient.setQueryData([QUERY_KEY, householdId], next)
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData([QUERY_KEY, householdId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, householdId] })
    },
  })
}

export function useDeleteHouseholdRecipeCategory() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('household_recipe_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, householdId] })
    },
  })
}
