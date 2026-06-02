import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { addDays, toIsoDate } from '@/lib/week'
import { scaleQuantity } from '@/lib/recipeScale'
import { dedupeIngredients } from '@/lib/parseIngredient'
import { useAddGroceriesBulk } from '@/hooks/useGroceries'
import type { MealPlanEntry, Recipe, RecipeIngredient } from '@/types'

export interface MealPlanDay {
  date: string
  entry: (MealPlanEntry & { recipe: Recipe }) | null
}

export function weekDateRange(weekStart: Date): { start: string; end: string } {
  return {
    start: toIsoDate(weekStart),
    end: toIsoDate(addDays(weekStart, 6)),
  }
}

export function useMealPlanWeek(weekStart: Date) {
  const { householdId } = useAuth()
  const { start, end } = weekDateRange(weekStart)

  return useQuery({
    queryKey: ['meal-plan', householdId, start],
    queryFn: async (): Promise<MealPlanDay[]> => {
      const { data, error } = await supabase
        .from('meal_plan_entries')
        .select('*, recipe:recipes(*)')
        .eq('household_id', householdId!)
        .gte('planned_date', start)
        .lte('planned_date', end)
        .order('planned_date', { ascending: true })
      if (error) throw error
      const entries = (data ?? []) as (MealPlanEntry & { recipe: Recipe })[]
      const byDate = new Map(entries.map(e => [e.planned_date, e]))
      const days: MealPlanDay[] = []
      for (let i = 0; i < 7; i++) {
        const date = toIsoDate(addDays(weekStart, i))
        days.push({ date, entry: byDate.get(date) ?? null })
      }
      return days
    },
    enabled: !!householdId,
  })
}

export function useUpsertMealPlanEntry() {
  const queryClient = useQueryClient()
  const { householdId, user } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      recipeId: string
      plannedDate: string
      servingsOverride?: number | null
    }) => {
      const { data, error } = await supabase
        .from('meal_plan_entries')
        .upsert(
          {
            household_id: householdId!,
            recipe_id: input.recipeId,
            planned_date: input.plannedDate,
            servings_override: input.servingsOverride ?? null,
            status: 'planned',
            created_by: user!.id,
          },
          { onConflict: 'household_id,planned_date' },
        )
        .select('*, recipe:recipes(*)')
        .single()
      if (error) throw error
      return data as MealPlanEntry & { recipe: Recipe }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', householdId] })
    },
  })
}

export function useUpdateMealPlanEntry() {
  const queryClient = useQueryClient()
  const { householdId } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      id: string
      status?: 'planned' | 'cooked' | 'skipped'
      servingsOverride?: number | null
      notes?: string | null
    }) => {
      const patch: Record<string, unknown> = {}
      if (input.status !== undefined) patch.status = input.status
      if (input.servingsOverride !== undefined) patch.servings_override = input.servingsOverride
      if (input.notes !== undefined) patch.notes = input.notes
      const { error } = await supabase
        .from('meal_plan_entries')
        .update(patch)
        .eq('id', input.id)
      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', householdId] })
    },
  })
}

export function useDeleteMealPlanEntry() {
  const queryClient = useQueryClient()
  const { householdId } = useAuth()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meal_plan_entries').delete().eq('id', id)
      if (error) throw error
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', householdId] })
    },
  })
}

export interface MealPlanGenerateLine {
  name: string
  quantity: string | null
  mealPlanEntryId: string
}

export function useGenerateShoppingList() {
  const queryClient = useQueryClient()
  const { householdId } = useAuth()
  const addBulk = useAddGroceriesBulk()

  const previewMutation = useMutation({
    mutationFn: async (entryIds: string[]): Promise<MealPlanGenerateLine[]> => {
      if (entryIds.length === 0) return []

      const { data: entries, error: entryErr } = await supabase
        .from('meal_plan_entries')
        .select('*, recipe:recipes(*)')
        .in('id', entryIds)
      if (entryErr) throw entryErr
      const rows = (entries ?? []) as (MealPlanEntry & { recipe: Recipe })[]
      if (rows.length === 0) return []

      const recipeIds = Array.from(new Set(rows.map(r => r.recipe_id)))
      const { data: ingredients, error: ingErr } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .in('recipe_id', recipeIds)
        .order('position', { ascending: true })
      if (ingErr) throw ingErr
      const byRecipe = new Map<string, RecipeIngredient[]>()
      for (const ing of (ingredients ?? []) as RecipeIngredient[]) {
        const existing = byRecipe.get(ing.recipe_id) ?? []
        existing.push(ing)
        byRecipe.set(ing.recipe_id, existing)
      }

      const scaled: MealPlanGenerateLine[] = []
      for (const entry of rows) {
        const baseServings = entry.recipe.servings || 1
        const targetServings = entry.servings_override ?? baseServings
        const factor = targetServings / baseServings
        const ings = byRecipe.get(entry.recipe_id) ?? []
        for (const ing of ings) {
          scaled.push({
            name: ing.name,
            quantity: scaleQuantity(ing.quantity, factor),
            mealPlanEntryId: entry.id,
          })
        }
      }

      const deduped = dedupeIngredients(
        scaled.map(s => ({
          name: s.name,
          quantity: s.quantity,
          mealPlanEntryId: s.mealPlanEntryId,
        })),
      )
      return deduped.map(d => ({
        name: d.name,
        quantity: d.quantity,
        mealPlanEntryId: d.mealPlanEntryId,
      }))
    },
  })

  const commitMutation = useMutation({
    mutationFn: async (lines: MealPlanGenerateLine[]) => {
      if (lines.length === 0) return []
      return addBulk.mutateAsync(
        lines.map(l => ({
          name: l.name,
          quantity: l.quantity ?? undefined,
          meal_plan_entry_id: l.mealPlanEntryId,
        })),
      )
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries', householdId] })
    },
  })

  return {
    preview: previewMutation,
    commit: commitMutation,
  }
}
