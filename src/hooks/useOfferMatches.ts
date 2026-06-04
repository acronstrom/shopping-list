import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { MatchedOffer } from '@/types'

export function useOfferMatches() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['offer-matches', householdId],
    queryFn: async (): Promise<MatchedOffer[]> => {
      const { data, error } = await supabase.functions.invoke<{ matches: MatchedOffer[] }>(
        'match-offers',
        { body: {} },
      )
      if (error) throw error
      return data?.matches ?? []
    },
    enabled: !!householdId,
    staleTime: 10 * 60 * 1000,
  })
}
