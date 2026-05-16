import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ImportedRecipe {
  name: string
  servings: number | null
  ingredients: string[]
  instructions: string | null
  image: string | null
  sourceUrl: string
}

interface ImportRecipeResponse extends Partial<ImportedRecipe> {
  error?: string
}

export function useImportRecipeUrl() {
  return useMutation({
    mutationFn: async (url: string): Promise<ImportedRecipe> => {
      const { data, error } = await supabase.functions.invoke<ImportRecipeResponse>(
        'import-recipe-url',
        { body: { url } }
      )
      if (error) throw error
      if (!data) throw new Error('Tomt svar från importen')
      if (data.error) throw new Error(data.error)
      return {
        name: data.name ?? 'Okänt recept',
        servings: data.servings ?? null,
        ingredients: data.ingredients ?? [],
        instructions: data.instructions ?? null,
        image: data.image ?? null,
        sourceUrl: data.sourceUrl ?? url,
      }
    },
  })
}
