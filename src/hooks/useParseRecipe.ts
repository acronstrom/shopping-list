import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ParsedIngredient {
  name: string
  quantity: string | null
  category: string
}

interface ParseRecipeResponse {
  ingredients?: ParsedIngredient[]
  error?: string
}

export function useParseRecipe() {
  return useMutation({
    mutationFn: async (imageBase64: string): Promise<ParsedIngredient[]> => {
      const { data, error } = await supabase.functions.invoke<ParseRecipeResponse>('parse-recipe', {
        body: { imageBase64 },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data?.ingredients ?? []
    },
  })
}
