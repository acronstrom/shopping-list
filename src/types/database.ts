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
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          created_by?: string
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
    }
  }
}
