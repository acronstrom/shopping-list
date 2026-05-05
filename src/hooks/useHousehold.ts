import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Household, HouseholdMember } from '@/types'

export function useHouseholdMembers() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['household-members', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', householdId!)
        .order('created_at')
      if (error) throw error
      return (data ?? []) as HouseholdMember[]
    },
    enabled: !!householdId,
  })
}

export function useCreateHousehold() {
  const { user, setHouseholdId } = useAuth()

  return useMutation({
    mutationFn: async (name: string) => {
      const id = crypto.randomUUID()

      const { error: hErr } = await supabase
        .from('households')
        .insert([{ id, name: name.trim(), created_by: user!.id }])
      if (hErr) throw hErr

      const { error: mErr } = await supabase.from('household_members').insert([{
        household_id: id,
        user_id: user!.id,
        email: user!.email!,
        status: 'accepted',
        invited_by: user!.id,
        joined_at: new Date().toISOString(),
      }])
      if (mErr) throw mErr

      setHouseholdId(id)
      return { id, name: name.trim(), created_by: user!.id } as Household
    },
  })
}

export function useJoinHousehold() {
  const { user, setHouseholdId } = useAuth()

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('household_members')
        .update({ user_id: user!.id, status: 'accepted', joined_at: new Date().toISOString() })
        .eq('email', user!.email!)
        .eq('status', 'pending')
        .select()
        .single()
      if (error) throw new Error('No pending invite found for your email.')
      const member = data as HouseholdMember
      setHouseholdId(member.household_id)
      return member
    },
  })
}

export function useInviteMember() {
  const { householdId, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.from('household_members').insert([{
        household_id: householdId!,
        email: email.trim().toLowerCase(),
        invited_by: user!.id,
        status: 'pending',
      }])
      if (error) {
        if (error.code === '23505') throw new Error('This email is already invited.')
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household-members', householdId] })
    },
  })
}
