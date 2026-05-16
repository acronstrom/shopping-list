import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ParsedIngredient {
  name: string
  quantity: string | null
  category: string
}

export interface ParsedRecipe {
  ingredients: ParsedIngredient[]
  instructions: string | null
}

interface ParseRecipeResponse {
  ingredients?: ParsedIngredient[]
  instructions?: string | null
  error?: string
}

export function useParseRecipe() {
  return useMutation({
    mutationFn: async (imageBase64: string): Promise<ParsedRecipe> => {
      const { data, error } = await supabase.functions.invoke<ParseRecipeResponse>('parse-recipe', {
        body: { imageBase64 },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return {
        ingredients: data?.ingredients ?? [],
        instructions: data?.instructions ?? null,
      }
    },
  })
}
