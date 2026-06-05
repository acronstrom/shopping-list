import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export interface OfferFeedback {
  frequent_name: string
  offer_name: string
}

// The household's dismissed offer suggestions. Both the per-store
// "Du köper ofta" list and the global matches read this to hide pairings
// the user marked as irrelevant.
export function useOfferFeedback() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['offer-feedback', householdId],
    queryFn: async (): Promise<OfferFeedback[]> => {
      const { data, error } = await supabase
        .from('offer_match_feedback')
        .select('frequent_name, offer_name')
        .eq('household_id', householdId!)
      if (error) throw error
      return (data ?? []) as OfferFeedback[]
    },
    enabled: !!householdId,
  })
}

export function useDismissOfferMatch() {
  const { householdId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ frequent_name, offer_name }: OfferFeedback) => {
      const { error } = await supabase
        .from('offer_match_feedback')
        .upsert(
          { household_id: householdId!, frequent_name, offer_name, created_by: user!.id },
          { onConflict: 'household_id,frequent_name,offer_name', ignoreDuplicates: true },
        )
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-feedback', householdId] })
      queryClient.invalidateQueries({ queryKey: ['offer-matches', householdId] })
    },
  })
}

export function useUndismissOfferMatch() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ frequent_name, offer_name }: OfferFeedback) => {
      const { error } = await supabase
        .from('offer_match_feedback')
        .delete()
        .match({ household_id: householdId!, frequent_name, offer_name })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-feedback', householdId] })
      queryClient.invalidateQueries({ queryKey: ['offer-matches', householdId] })
    },
  })
}
