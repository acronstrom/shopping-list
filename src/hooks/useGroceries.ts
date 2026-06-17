import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { capitalizeFirst, normalizeItemName } from '@/lib/text'
import type { GroceryItem, MsftTodoConnectionSummary } from '@/types'

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
        meal_plan_entry_id: null,
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
  meal_plan_entry_id?: string | null
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
        meal_plan_entry_id: item.meal_plan_entry_id ?? null,
        added_by: user!.id,
      }))

      const { data, error } = await supabase
        .from('grocery_items')
        .insert(rows)
        .select()
      if (error) throw error

      const inserted = (data ?? []) as GroceryItem[]

      // Fire-and-forget categorization for items that arrived without a real
      // category (recipe page, meal plan). Items that already carry one — e.g.
      // photo recipe import — are left untouched. One batch call for the lot.
      const uncategorized = inserted.filter(item => item.category === 'Övrigt')
      if (uncategorized.length > 0) {
        supabase.functions
          .invoke('categorize-item', { body: { itemNames: uncategorized.map(i => i.name) } })
          .then(({ data: catData }) => {
            const map = (catData as { categories?: Record<string, string> })?.categories ?? {}
            const updates = uncategorized
              .map(item => ({ id: item.id, category: map[item.name] }))
              .filter(u => u.category && u.category !== 'Övrigt')
            if (updates.length === 0) return
            Promise.all(
              updates.map(u =>
                supabase.from('grocery_items').update({ category: u.category }).eq('id', u.id),
              ),
            ).then(() => {
              queryClient.invalidateQueries({ queryKey: ['groceries', householdId] })
            })
          })
          .catch(() => { /* swallow — categorization is best-effort */ })
      }

      return inserted
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
        meal_plan_entry_id: item.meal_plan_entry_id ?? null,
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
    onSuccess: (_data, { id, is_checked }) => {
      // Two-way sync: push the tick/un-tick to the linked Microsoft To Do
      // task. Best-effort — the edge function no-ops if the item isn't
      // linked, and the next sync self-heals a dropped push.
      const connection = queryClient.getQueryData<MsftTodoConnectionSummary | null>(
        ['msft-todo-connection', householdId],
      )
      if (!connection?.list_id || !connection.can_write) return
      supabase.functions.invoke('msft-todo', {
        body: { action: 'task-status', groceryItemId: id, isChecked: is_checked },
      }).catch(() => { /* swallow — next sync reconciles */ })
    },
  })
}

// Manually set an item's category. Applies the choice to every item currently
// on the list with the same (normalized) name, and remembers it as a learned
// override so future adds/syncs of that name skip the model and use this
// category. See supabase/functions/_shared/categorize.ts.
export function useSetGroceryCategory() {
  const queryClient = useQueryClient()
  const { householdId, user } = useAuth()

  return useMutation({
    mutationFn: async ({ id, name, category }: { id: string; name: string; category: string }) => {
      const key = normalizeItemName(name)
      const current =
        queryClient.getQueryData<GroceryItem[]>(['groceries', householdId]) ?? []
      const ids = current
        .filter(i => i.id === id || normalizeItemName(i.name) === key)
        .map(i => i.id)
      const targetIds = ids.length > 0 ? ids : [id]

      const { error: updErr } = await supabase
        .from('grocery_items')
        .update({ category })
        .in('id', targetIds)
      if (updErr) throw updErr

      // Remember the correction for next time. Best-effort: the visible change
      // already succeeded, so don't fail the mutation if learning doesn't stick.
      const { error: ovrErr } = await supabase
        .from('category_overrides')
        .upsert(
          { household_id: householdId!, item_name: key, category, updated_by: user!.id },
          { onConflict: 'household_id,item_name' },
        )
      if (ovrErr) console.error('[useSetGroceryCategory] override upsert failed', ovrErr)
    },
    onMutate: async ({ id, name, category }) => {
      await queryClient.cancelQueries({ queryKey: ['groceries', householdId] })
      const prev = queryClient.getQueryData<GroceryItem[]>(['groceries', householdId])
      const key = normalizeItemName(name)
      queryClient.setQueryData<GroceryItem[]>(['groceries', householdId], old =>
        old?.map(item =>
          item.id === id || normalizeItemName(item.name) === key
            ? { ...item, category }
            : item,
        ) ?? [],
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
