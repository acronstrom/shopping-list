import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface CategorizeRecipeInput {
  recipeName: string
  ingredientNames: string[]
}

interface CategorizeRecipeResponse {
  category?: string | null
  error?: string
}

export function useCategorizeRecipe() {
  return useMutation({
    mutationFn: async ({ recipeName, ingredientNames }: CategorizeRecipeInput): Promise<string | null> => {
      const { data, error } = await supabase.functions.invoke<CategorizeRecipeResponse>(
        'categorize-recipe',
        { body: { recipeName, ingredientNames } },
      )
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data?.category ?? null
    },
  })
}
