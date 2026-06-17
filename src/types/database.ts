export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
      }
      household_members: {
        Row: {
          id: string
          household_id: string
          user_id: string | null
          email: string
          status: 'pending' | 'accepted'
          invited_by: string
          joined_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id?: string | null
          email: string
          status?: 'pending' | 'accepted'
          invited_by: string
          joined_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string | null
          email?: string
          status?: 'pending' | 'accepted'
          invited_by?: string
          joined_at?: string | null
          created_at?: string
        }
      }
      stores: {
        Row: {
          id: string
          household_id: string
          name: string
          offers_url: string | null
          offers_scraped_at: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          offers_url?: string | null
          offers_scraped_at?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          offers_url?: string | null
          offers_scraped_at?: string | null
          created_by?: string
          created_at?: string
        }
      }
      store_offers: {
        Row: {
          id: string
          store_id: string
          name: string
          brand: string | null
          price: string | null
          unit: string | null
          comparison_price: string | null
          valid_period: string | null
          category: string | null
          valid_to: string | null
          position: number
          scraped_at: string
        }
        Insert: {
          id?: string
          store_id: string
          name: string
          brand?: string | null
          price?: string | null
          unit?: string | null
          comparison_price?: string | null
          valid_period?: string | null
          category?: string | null
          valid_to?: string | null
          position?: number
          scraped_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          name?: string
          brand?: string | null
          price?: string | null
          unit?: string | null
          comparison_price?: string | null
          valid_period?: string | null
          category?: string | null
          valid_to?: string | null
          position?: number
          scraped_at?: string
        }
      }
      name_embeddings: {
        Row: {
          text_key: string
          embedding: number[]
          model: string
          created_at: string
        }
        Insert: {
          text_key: string
          embedding: number[]
          model: string
          created_at?: string
        }
        Update: {
          text_key?: string
          embedding?: number[]
          model?: string
          created_at?: string
        }
      }
      grocery_items: {
        Row: {
          id: string
          household_id: string
          name: string
          category: string
          quantity: string | null
          note: string | null
          is_checked: boolean
          added_by: string
          meal_plan_entry_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          category?: string
          quantity?: string | null
          note?: string | null
          is_checked?: boolean
          added_by: string
          meal_plan_entry_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          category?: string
          quantity?: string | null
          note?: string | null
          is_checked?: boolean
          added_by?: string
          meal_plan_entry_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      aisle_orders: {
        Row: {
          id: string
          store_id: string
          item_name: string
          aisle: number
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          item_name: string
          aisle: number
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          item_name?: string
          aisle?: number
          updated_at?: string
        }
      }
      purchase_history: {
        Row: {
          id: string
          household_id: string
          item_name: string
          category: string | null
          purchased_by: string
          purchased_at: string
        }
        Insert: {
          id?: string
          household_id: string
          item_name: string
          category?: string | null
          purchased_by: string
          purchased_at?: string
        }
        Update: never
      }
      household_categories: {
        Row: {
          id: string
          household_id: string
          name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          sort_order?: number
          created_at?: string
        }
      }
      category_overrides: {
        Row: {
          id: string
          household_id: string
          item_name: string
          category: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          item_name: string
          category: string
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          item_name?: string
          category?: string
          updated_by?: string | null
          updated_at?: string
        }
      }
      recipes: {
        Row: {
          id: string
          household_id: string
          name: string
          notes: string | null
          instructions: string | null
          servings: number
          category: string | null
          image_path: string | null
          source_url: string | null
          prep_time_minutes: number | null
          cook_time_minutes: number | null
          difficulty: 'enkel' | 'medel' | 'svår' | null
          rating: number | null
          tags: string[]
          is_favorite: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          notes?: string | null
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
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          notes?: string | null
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
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      meal_plan_entries: {
        Row: {
          id: string
          household_id: string
          recipe_id: string
          planned_date: string
          servings_override: number | null
          status: 'planned' | 'cooked' | 'skipped'
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          recipe_id: string
          planned_date: string
          servings_override?: number | null
          status?: 'planned' | 'cooked' | 'skipped'
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          recipe_id?: string
          planned_date?: string
          servings_override?: number | null
          status?: 'planned' | 'cooked' | 'skipped'
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      household_recipe_categories: {
        Row: {
          id: string
          household_id: string
          name: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          sort_order?: number
          created_at?: string
        }
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          name: string
          quantity: string | null
          section: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          name: string
          quantity?: string | null
          section?: string | null
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          name?: string
          quantity?: string | null
          section?: string | null
          position?: number
          created_at?: string
        }
      }
      household_msft_todo_connections: {
        Row: {
          id: string
          household_id: string
          connected_by: string
          connected_email: string
          access_token: string
          refresh_token: string
          expires_at: string
          list_id: string | null
          list_name: string | null
          last_synced_at: string | null
          last_sync_error: string | null
          can_write: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          connected_by: string
          connected_email: string
          access_token: string
          refresh_token: string
          expires_at: string
          list_id?: string | null
          list_name?: string | null
          last_synced_at?: string | null
          last_sync_error?: string | null
          can_write?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          connected_by?: string
          connected_email?: string
          access_token?: string
          refresh_token?: string
          expires_at?: string
          list_id?: string | null
          list_name?: string | null
          last_synced_at?: string | null
          last_sync_error?: string | null
          can_write?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      msft_todo_task_links: {
        Row: {
          id: string
          household_id: string
          msft_task_id: string
          grocery_item_id: string | null
          last_seen_at: string
          history_imported_at: string | null
          app_completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          msft_task_id: string
          grocery_item_id?: string | null
          last_seen_at?: string
          history_imported_at?: string | null
          app_completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          msft_task_id?: string
          grocery_item_id?: string | null
          last_seen_at?: string
          history_imported_at?: string | null
          app_completed_at?: string | null
          created_at?: string
        }
      }
      store_category_orders: {
        Row: {
          id: string
          store_id: string
          category_name: string
          position: number
          updated_at: string
        }
        Insert: {
          id?: string
          store_id: string
          category_name: string
          position?: number
          updated_at?: string
        }
        Update: {
          id?: string
          store_id?: string
          category_name?: string
          position?: number
          updated_at?: string
        }
      }
    }
  }
}
