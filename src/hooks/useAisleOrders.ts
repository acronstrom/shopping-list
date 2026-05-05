import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AisleOrder } from '@/types'

export function useAisleOrders(storeId: string | null) {
  return useQuery({
    queryKey: ['aisle-orders', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aisle_orders')
        .select('*')
        .eq('store_id', storeId!)
      if (error) throw error
      return (data ?? []) as AisleOrder[]
    },
    enabled: !!storeId,
  })
}

export function useUpsertAisleOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ storeId, itemName, aisle }: { storeId: string; itemName: string; aisle: number }) => {
      const { error } = await supabase
        .from('aisle_orders')
        .upsert(
          [{ store_id: storeId, item_name: itemName.toLowerCase().trim(), aisle }],
          { onConflict: 'store_id,item_name' }
        )
      if (error) throw error
    },
    onSuccess: (_data, { storeId }) => {
      queryClient.invalidateQueries({ queryKey: ['aisle-orders', storeId] })
    },
  })
}
