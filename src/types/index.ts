import type { Database } from './database'

export type Household = Database['public']['Tables']['households']['Row']
export type HouseholdMember = Database['public']['Tables']['household_members']['Row']
export type Store = Database['public']['Tables']['stores']['Row']
export type GroceryItem = Database['public']['Tables']['grocery_items']['Row']
export type AisleOrder = Database['public']['Tables']['aisle_orders']['Row']
export type PurchaseHistory = Database['public']['Tables']['purchase_history']['Row']
export type HouseholdCategory = Database['public']['Tables']['household_categories']['Row']
export type HouseholdRecipeCategory = Database['public']['Tables']['household_recipe_categories']['Row']
export type StoreCategoryOrder = Database['public']['Tables']['store_category_orders']['Row']
export type StoreOffer = Database['public']['Tables']['store_offers']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
export type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Row']
export type MealPlanEntry = Database['public']['Tables']['meal_plan_entries']['Row']

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
