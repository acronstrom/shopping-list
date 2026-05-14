import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { capitalizeFirst } from '@/lib/text'
import type { GroceryItem } from '@/types'

export function useGroceries() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['groceries', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('household_id', householdId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as GroceryItem[]
    },
    enabled: !!householdId,
  })
}

export function useAddGrocery() {
  const queryClient = useQueryClient()
  const { householdId, user } = useAuth()

  return useMutation({
    mutationFn: async ({ name, quantity, note }: { name: string; quantity?: string; note?: string }) => {
      const tempId = crypto.randomUUID()
      const cleanName = capitalizeFirst(name.trim())

      const { data, error } = await supabase
        .from('grocery_items')
        .insert([{
          id: tempId,
          household_id: householdId!,
          name: cleanName,
          category: 'Övrigt',
          quantity: quantity?.trim() || null,
          note: note?.trim() || null,
          added_by: user!.id,
        }])
        .select()
        .single()
      if (error) throw error

      // Fire-and-forget category assignment
      supabase.functions.invoke('categorize-item', { body: { itemName: cleanName } })
        .then(({ data: catData }) => {
          const category = (catData as { category?: string })?.category
          if (category && category !== 'Övrigt') {
            supabase
              .from('grocery_items')
              .update({ category })
              .eq('id', tempId)
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ['groceries', householdId] })
              })
          }
        })

      return data as GroceryItem
    },
    onMutate: async ({ name, quantity, note }) => {
      await queryClient.cancelQueries({ queryKey: ['groceries', householdId] })
      const prev = queryClient.getQueryData<GroceryItem[]>(['groceries', householdId])
      const optimistic: GroceryItem = {
        id: `temp-${Date.now()}`,
        household_id: householdId!,
        name: capitalizeFirst(name.trim()),
        category: 'Övrigt',
        quantity: quantity?.trim() || null,
        note: note?.trim() || null,
        is_checked: false,
        added_by: user!.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      queryClient.setQueryData<GroceryItem[]>(['groceries', householdId], old =>
        [optimistic, ...(old ?? [])]
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['groceries', householdId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries', householdId] })
    },
  })
}

export interface BulkGroceryInput {
  name: string
  quantity?: string | null
  category?: string
}

export function useAddGroceriesBulk() {
  const queryClient = useQueryClient()
  const { householdId, user } = useAuth()

  return useMutation({
    mutationFn: async (items: BulkGroceryInput[]) => {
      if (items.length === 0) return []
      const rows = items.map(item => ({
        household_id: householdId!,
        name: capitalizeFirst(item.name.trim()),
        category: item.category?.trim() || 'Övrigt',
        quantity: item.quantity?.trim() || null,
        added_by: user!.id,
      }))

      const { data, error } = await supabase
        .from('grocery_items')
        .insert(rows)
        .select()
      if (error) throw error
      return (data ?? []) as GroceryItem[]
    },
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: ['groceries', householdId] })
      const prev = queryClient.getQueryData<GroceryItem[]>(['groceries', householdId])
      const now = new Date().toISOString()
      const optimistic: GroceryItem[] = items.map((item, i) => ({
        id: `temp-${Date.now()}-${i}`,
        household_id: householdId!,
        name: capitalizeFirst(item.name.trim()),
        category: item.category?.trim() || 'Övrigt',
        quantity: item.quantity?.trim() || null,
        note: null,
        is_checked: false,
        added_by: user!.id,
        created_at: now,
        updated_at: now,
      }))
      queryClient.setQueryData<GroceryItem[]>(['groceries', householdId], old =>
        [...optimistic, ...(old ?? [])]
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['groceries', householdId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries', householdId] })
    },
  })
}

export function useToggleGrocery() {
  const queryClient = useQueryClient()
  const { householdId } = useAuth()

  return useMutation({
    mutationFn: async ({ id, is_checked }: { id: string; is_checked: boolean }) => {
      const { error } = await supabase
        .from('grocery_items')
        .update({ is_checked })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, is_checked }) => {
      await queryClient.cancelQueries({ queryKey: ['groceries', householdId] })
      const prev = queryClient.getQueryData<GroceryItem[]>(['groceries', householdId])
      queryClient.setQueryData<GroceryItem[]>(['groceries', householdId], old =>
        old?.map(item => item.id === id ? { ...item, is_checked } : item) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['groceries', householdId], ctx.prev)
    },
  })
}

export function useDeleteGrocery() {
  const queryClient = useQueryClient()
  const { householdId } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('grocery_items').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['groceries', householdId] })
      const prev = queryClient.getQueryData<GroceryItem[]>(['groceries', householdId])
      queryClient.setQueryData<GroceryItem[]>(['groceries', householdId], old =>
        old?.filter(item => item.id !== id) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['groceries', householdId], ctx.prev)
    },
  })
}

export function useClearChecked() {
  const queryClient = useQueryClient()
  const { householdId, user } = useAuth()

  return useMutation({
    mutationFn: async (items: GroceryItem[]) => {
      const historyInserts = items.map(item => ({
        household_id: householdId!,
        item_name: item.name.toLowerCase().trim(),
        category: item.category,
        purchased_by: user!.id,
      }))

      const { error: histErr } = await supabase.from('purchase_history').insert(historyInserts)
      if (histErr) throw histErr

      const ids = items.map(i => i.id)
      const { error: delErr } = await supabase.from('grocery_items').delete().in('id', ids)
      if (delErr) throw delErr
    },
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: ['groceries', householdId] })
      const prev = queryClient.getQueryData<GroceryItem[]>(['groceries', householdId])
      const ids = new Set(items.map(i => i.id))
      queryClient.setQueryData<GroceryItem[]>(['groceries', householdId], old =>
        old?.filter(item => !ids.has(item.id)) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['groceries', householdId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-history', householdId] })
    },
  })
}
