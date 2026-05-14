import type { Database } from './database'

export type Household = Database['public']['Tables']['households']['Row']
export type HouseholdMember = Database['public']['Tables']['household_members']['Row']
export type Store = Database['public']['Tables']['stores']['Row']
export type GroceryItem = Database['public']['Tables']['grocery_items']['Row']
export type AisleOrder = Database['public']['Tables']['aisle_orders']['Row']
export type PurchaseHistory = Database['public']['Tables']['purchase_history']['Row']
export type HouseholdCategory = Database['public']['Tables']['household_categories']['Row']
export type StoreCategoryOrder = Database['public']['Tables']['store_category_orders']['Row']
export type StoreOffer = Database['public']['Tables']['store_offers']['Row']

export type GroceryItemInsert = Database['public']['Tables']['grocery_items']['Insert']
export type StoreInsert = Database['public']['Tables']['stores']['Insert']

export interface Suggestion {
  item_name: string
  category: string | null
  count: number
}
