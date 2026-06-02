import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { getRecipeImageUrl } from '@/lib/recipeImage'
import type { Recipe, RecipeIngredient, RecipeWithIngredients } from '@/types'

export interface RecipeIngredientInput {
  name: string
  quantity?: string | null
  section?: string | null
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
  category?: string | null
  image_path?: string | null
  source_url?: string | null
  prep_time_minutes?: number | null
  cook_time_minutes?: number | null
  difficulty?: 'enkel' | 'medel' | 'svår' | null
  rating?: number | null
  tags?: string[]
  is_favorite?: boolean
  ingredients: RecipeIngredientInput[]
}

function cleanRecipeFields(input: RecipeInput) {
  return {
    image_path: input.image_path ?? null,
    source_url: input.source_url?.trim() || null,
    prep_time_minutes: input.prep_time_minutes ?? null,
    cook_time_minutes: input.cook_time_minutes ?? null,
    difficulty: input.difficulty ?? null,
    rating: input.rating ?? null,
    tags: (input.tags ?? []).map(t => t.trim()).filter(Boolean),
    is_favorite: input.is_favorite ?? false,
  }
}

async function autoCategorize(
  recipeName: string,
  ingredientNames: string[],
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke<{ category?: string | null }>(
      'categorize-recipe',
      { body: { recipeName, ingredientNames } },
    )
    if (error) {
      console.error('[useRecipes] categorize-recipe failed', error)
      return null
    }
    return data?.category ?? null
  } catch (err) {
    console.error('[useRecipes] categorize-recipe threw', err)
    return null
  }
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
    mutationFn: async (input: RecipeInput) => {
      const { name, instructions, servings, category, ingredients } = input
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('Receptet behöver ett namn')

      const manualCategory = category?.trim() || null
      const extra = cleanRecipeFields(input)

      const { data: recipe, error: recipeErr } = await supabase
        .from('recipes')
        .insert([{
          household_id: householdId!,
          name: trimmedName,
          instructions: instructions?.trim() || null,
          servings: servings ?? 4,
          category: manualCategory,
          ...extra,
          created_by: user!.id,
        }])
        .select()
        .single()
      if (recipeErr) throw recipeErr

      const cleaned = ingredients
        .map(i => ({
          name: i.name.trim(),
          quantity: i.quantity?.trim() || null,
          section: i.section?.trim() || null,
        }))
        .filter(i => i.name.length > 0)

      if (cleaned.length > 0) {
        const rows = cleaned.map((i, idx) => ({
          recipe_id: (recipe as Recipe).id,
          name: i.name,
          quantity: i.quantity,
          section: i.section,
          position: idx,
        }))
        const { error: ingErr } = await supabase.from('recipe_ingredients').insert(rows)
        if (ingErr) throw ingErr
      }

      let finalRecipe = recipe as Recipe
      if (!manualCategory) {
        const aiCategory = await autoCategorize(trimmedName, cleaned.map(i => i.name))
        if (aiCategory) {
          const { data: updated, error: updErr } = await supabase
            .from('recipes')
            .update({ category: aiCategory })
            .eq('id', finalRecipe.id)
            .select()
            .single()
          if (!updErr && updated) finalRecipe = updated as Recipe
        }
      }

      return finalRecipe
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
    mutationFn: async (input: RecipeInput & { id: string }) => {
      const { id, name, instructions, servings, category, ingredients } = input
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error('Receptet behöver ett namn')

      const manualCategory = category?.trim() || null
      const extra = cleanRecipeFields(input)

      const { error: recipeErr } = await supabase
        .from('recipes')
        .update({
          name: trimmedName,
          instructions: instructions?.trim() || null,
          servings: servings ?? 4,
          category: manualCategory,
          ...extra,
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
        .map(i => ({
          name: i.name.trim(),
          quantity: i.quantity?.trim() || null,
          section: i.section?.trim() || null,
        }))
        .filter(i => i.name.length > 0)

      if (cleaned.length > 0) {
        const rows = cleaned.map((i, idx) => ({
          recipe_id: id,
          name: i.name,
          quantity: i.quantity,
          section: i.section,
          position: idx,
        }))
        const { error: ingErr } = await supabase.from('recipe_ingredients').insert(rows)
        if (ingErr) throw ingErr
      }

      if (!manualCategory) {
        const aiCategory = await autoCategorize(trimmedName, cleaned.map(i => i.name))
        if (aiCategory) {
          await supabase
            .from('recipes')
            .update({ category: aiCategory })
            .eq('id', id)
        }
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['recipes', householdId] })
      queryClient.invalidateQueries({ queryKey: ['recipe', vars.id] })
    },
  })
}

export function useSetRecipeCategory() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, category }: { id: string; category: string | null }) => {
      const { error } = await supabase
        .from('recipes')
        .update({ category })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['recipes', householdId] })
      queryClient.invalidateQueries({ queryKey: ['recipe', vars.id] })
    },
  })
}

export function useToggleRecipeFavorite() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase
        .from('recipes')
        .update({ is_favorite })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, is_favorite }) => {
      await queryClient.cancelQueries({ queryKey: ['recipes', householdId] })
      const prev = queryClient.getQueryData<RecipeWithIngredients[]>(['recipes', householdId])
      queryClient.setQueryData<RecipeWithIngredients[]>(
        ['recipes', householdId],
        old => (old ?? []).map(r => (r.id === id ? { ...r, is_favorite } : r)),
      )
      const prevSingle = queryClient.getQueryData<RecipeWithIngredients | null>(['recipe', id])
      if (prevSingle) {
        queryClient.setQueryData<RecipeWithIngredients | null>(
          ['recipe', id],
          { ...prevSingle, is_favorite },
        )
      }
      return { prev, prevSingle }
    },
    onError: (_err, vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['recipes', householdId], ctx.prev)
      if (ctx?.prevSingle !== undefined) queryClient.setQueryData(['recipe', vars.id], ctx.prevSingle)
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['recipes', householdId] })
      queryClient.invalidateQueries({ queryKey: ['recipe', vars.id] })
    },
  })
}

export function useRecipeImageUrl(imagePath: string | null | undefined) {
  return useQuery({
    queryKey: ['recipe-image-url', imagePath],
    queryFn: () => getRecipeImageUrl(imagePath ?? null),
    enabled: !!imagePath,
    staleTime: 50 * 60 * 1000,
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
