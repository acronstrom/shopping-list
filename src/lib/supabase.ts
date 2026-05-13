import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { supabase: typeof supabase }).supabase = supabase
  ;(window as unknown as { testCategorize: (name: string) => Promise<unknown> }).testCategorize =
    async (name: string) => {
      const res = await supabase.functions.invoke('categorize-item', { body: { itemName: name } })
      console.log('[testCategorize]', name, res)
      return res
    }
}
