import type { Database } from './database'

export type Household = Database['public']['Tables']['households']['Row']
export type HouseholdMember = Database['public']['Tables']['household_members']['Row']
export type Store = Database['public']['Tables']['stores']['Row']
export type GroceryItem = Database['public']['Tables']['grocery_items']['Row']
export type AisleOrder = Database['public']['Tables']['aisle_orders']['Row']
export type PurchaseHistory = Database['public']['Tables']['purchase_history']['Row']
export type HouseholdCategory = Database['public']['Tables']['household_categories']['Row']
export type CategoryOverride = Database['public']['Tables']['category_overrides']['Row']
export type HouseholdSubcategory = Database['public']['Tables']['household_subcategories']['Row']
export type HouseholdRecipeCategory = Database['public']['Tables']['household_recipe_categories']['Row']
export type StoreCategoryOrder = Database['public']['Tables']['store_category_orders']['Row']
export type StoreCategoryMap = Database['public']['Tables']['store_category_map']['Row']
export type StoreOffer = Database['public']['Tables']['store_offers']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
export type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Row']
export type MealPlanEntry = Database['public']['Tables']['meal_plan_entries']['Row']

type MsftTodoConnectionRow = Database['public']['Tables']['household_msft_todo_connections']['Row']
export type MsftTodoConnectionSummary = Pick<
  MsftTodoConnectionRow,
  'id' | 'connected_email' | 'list_id' | 'list_name' | 'last_synced_at' | 'last_sync_error' | 'can_write'
>

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[]
}

export interface MealPlanEntryWithRecipe extends MealPlanEntry {
  recipe: Recipe
}

export type GroceryItemInsert = Database['public']['Tables']['grocery_items']['Insert']
export type StoreInsert = Database['public']['Tables']['stores']['Insert']

export interface Suggestion {
  item_name: string
  category: string | null
  count: number
}

// Returned by the match-offers edge function: a store offer that semantically
// matches one of the household's frequently-bought items.
export interface MatchedOffer {
  id: string
  store_id: string
  name: string
  brand: string | null
  price: string | null
  unit: string | null
  comparison_price: string | null
  valid_period: string | null
  valid_to: string | null
  category: string | null
  storeName: string
  matchedName: string
  count: number
  score: number
}
