import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Recipe, RecipeIngredient, RecipeWithIngredients } from '@/types'

export interface RecipeIngredientInput {
  name: string
  quantity?: string | null
}

export function useRecipes() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['recipes', householdId],
    queryFn: async (): Promise<RecipeWithIngredients[]> => {
      const { data: recipeRows, error: recipeErr } = await supabase
        .from('recipes')
        .select('*')
        .eq('household_id', householdId!)
        .order('name', { ascending: true })
      if (recipeErr) throw recipeErr
      const recipes = (recipeRows ?? []) as Recipe[]
      if (recipes.length === 0) return []

      const ids = recipes.map(r => r.id)
      const { data: ingredientRows, error: ingErr } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .in('recipe_id', ids)
        .order('position', { ascending: true })
      if (ingErr) throw ingErr

      const byRecipe = new Map<string, RecipeIngredient[]>()
      for (const ing of (ingredientRows ?? []) as RecipeIngredient[]) {
        const existing = byRecipe.get(ing.recipe_id) ?? []
        existing.push(ing)
        byRecipe.set(ing.recipe_id, existing)
      }

      return recipes.map(r => ({
        ...r,
        ingredients: byRecipe.get(r.id) ?? [],
      }))
    },
    enabled: !!householdId,
  })
}

export interface RecipeInput {
  name: string
  instructions?: string | null
  servings?: number
  ingredients: RecipeIngredientInput[]
}

export function useRecipe(id: string | null) {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async (): Promise<RecipeWithIngredients | null> => {
      if (!id) return null
      const { data: recipe, error: recipeErr } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (recipeErr) throw recipeErr
      if (!recipe) return null

      const { data: ingredients, error: ingErr } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', id)
        .order('position', { ascending: true })
      if (ingErr) throw ingErr

      return {
        ...(recipe as Recipe),
        ingredients: (ingredients ?? []) as RecipeIngredient[],
      }
    },
    enabled: !!id && !!householdId,
  })
}

export function useAddRecipe() {
  const { householdId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, instructions, servings, ingredients }: RecipeInput) => {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('Receptet behöver ett namn')

      const { data: recipe, error: recipeErr } = await supabase
        .from('recipes')
        .insert([{
          household_id: householdId!,
          name: trimmedName,
          instructions: instructions?.trim() || null,
          servings: servings ?? 4,
          created_by: user!.id,
        }])
        .select()
        .single()
      if (recipeErr) throw recipeErr

      const cleaned = ingredients
        .map(i => ({ name: i.name.trim(), quantity: i.quantity?.trim() || null }))
        .filter(i => i.name.length > 0)

      if (cleaned.length > 0) {
        const rows = cleaned.map((i, idx) => ({
          recipe_id: (recipe as Recipe).id,
          name: i.name,
          quantity: i.quantity,
          position: idx,
        }))
        const { error: ingErr } = await supabase.from('recipe_ingredients').insert(rows)
        if (ingErr) throw ingErr
      }

      return recipe as Recipe
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', householdId] })
    },
  })
}

export function useUpdateRecipe() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      name,
      instructions,
      servings,
      ingredients,
    }: RecipeInput & { id: string }) => {
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('Receptet behöver ett namn')

      const { error: recipeErr } = await supabase
        .from('recipes')
        .update({
          name: trimmedName,
          instructions: instructions?.trim() || null,
          servings: servings ?? 4,
        })
        .eq('id', id)
      if (recipeErr) throw recipeErr

      // Replace ingredient rows. Simpler and more reliable than diffing,
      // and the table is small (a few rows per recipe).
      const { error: delErr } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id)
      if (delErr) throw delErr

      const cleaned = ingredients
        .map(i => ({ name: i.name.trim(), quantity: i.quantity?.trim() || null }))
        .filter(i => i.name.length > 0)

      if (cleaned.length > 0) {
        const rows = cleaned.map((i, idx) => ({
          recipe_id: id,
          name: i.name,
          quantity: i.quantity,
          position: idx,
        }))
        const { error: ingErr } = await supabase.from('recipe_ingredients').insert(rows)
        if (ingErr) throw ingErr
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['recipes', householdId] })
      queryClient.invalidateQueries({ queryKey: ['recipe', vars.id] })
    },
  })
}

export function useDeleteRecipe() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['recipes', householdId] })
      const prev = queryClient.getQueryData<RecipeWithIngredients[]>(['recipes', householdId])
      queryClient.setQueryData<RecipeWithIngredients[]>(
        ['recipes', householdId],
        old => (old ?? []).filter(r => r.id !== id)
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['recipes', householdId], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', householdId] })
    },
  })
}
