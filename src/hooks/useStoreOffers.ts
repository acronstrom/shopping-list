import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { StoreOffer } from '@/types'

interface FetchOffersResponse {
  count?: number
  scraped_at?: string
  error?: string
}

export function useStoreOffers(storeId: string | null) {
  return useQuery({
    queryKey: ['store-offers', storeId],
    queryFn: async () => {
      if (!storeId) return [] as StoreOffer[]
      const { data, error } = await supabase
        .from('store_offers')
        .select('*')
        .eq('store_id', storeId)
        .order('position', { ascending: true })
      if (error) throw error
      return (data ?? []) as StoreOffer[]
    },
    enabled: !!storeId,
  })
}

export function useRefreshOffers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (storeId: string) => {
      const { data, error } = await supabase.functions.invoke<FetchOffersResponse>('fetch-offers', {
        body: { storeId },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return { storeId, count: data?.count ?? 0, scraped_at: data?.scraped_at }
    },
    onSuccess: ({ storeId }) => {
      queryClient.invalidateQueries({ queryKey: ['store-offers', storeId] })
      queryClient.invalidateQueries({ queryKey: ['stores'] })
    },
  })
}
