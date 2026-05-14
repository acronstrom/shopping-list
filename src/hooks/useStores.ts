import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Store } from '@/types'

export function useStores() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['stores', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('household_id', householdId!)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as Store[]
    },
    enabled: !!householdId,
  })
}

export function useAddStore() {
  const { householdId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('stores')
        .insert([{ household_id: householdId!, name: name.trim(), created_by: user!.id }])
        .select()
        .single()
      if (error) {
        if (error.code === '23505') throw new Error('A store with this name already exists.')
        throw error
      }
      return data as Store
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', householdId] })
    },
  })
}

export function useUpdateStore() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, offers_url }: { id: string; offers_url: string | null }) => {
      const { data, error } = await supabase
        .from('stores')
        .update({ offers_url })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Store
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', householdId] })
    },
  })
}

export function useDeleteStore() {
  const { householdId } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stores').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores', householdId] })
      queryClient.invalidateQueries({ queryKey: ['aisle-orders'] })
    },
  })
}
