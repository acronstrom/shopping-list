import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { MsftTodoConnectionSummary } from '@/types'

export function useMsftTodoConnection() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['msft-todo-connection', householdId],
    queryFn: async (): Promise<MsftTodoConnectionSummary | null> => {
      const { data, error } = await supabase
        .from('household_msft_todo_connections')
        .select('id, connected_email, list_id, list_name, last_synced_at, last_sync_error')
        .eq('household_id', householdId!)
        .maybeSingle()
      if (error) throw error
      return (data as MsftTodoConnectionSummary | null) ?? null
    },
    enabled: !!householdId,
  })
}

export function useStartMsftTodoConnect() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{ authorize_url: string }>(
        'msft-todo-start',
        { body: {} },
      )
      if (error) throw error
      if (!data?.authorize_url) throw new Error('Tomt svar från msft-todo-start')
      window.location.assign(data.authorize_url)
    },
  })
}

export interface MsftTodoListChoice {
  id: string
  displayName: string
}

export function useMsftTodoLists(enabled: boolean) {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['msft-todo-lists', householdId],
    queryFn: async (): Promise<MsftTodoListChoice[]> => {
      const { data, error } = await supabase.functions.invoke<{ lists: MsftTodoListChoice[] }>(
        'msft-todo',
        { body: { action: 'lists' } },
      )
      if (error) throw error
      return data?.lists ?? []
    },
    enabled: enabled && !!householdId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useSetMsftTodoList() {
  const queryClient = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: async (input: { listId: string; listName: string }) => {
      const { error } = await supabase.functions.invoke('msft-todo', {
        body: { action: 'set-list', listId: input.listId, listName: input.listName },
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msft-todo-connection', householdId] })
    },
  })
}

export interface SyncResult {
  added: number
  alreadyTracked: number
  error?: string
}

export function useSyncMsftTodo() {
  const queryClient = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const { data, error } = await supabase.functions.invoke<SyncResult>('msft-todo', {
        body: { action: 'sync' },
      })
      if (error) throw error
      if (!data) throw new Error('Tomt svar från msft-todo')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groceries', householdId] })
      queryClient.invalidateQueries({ queryKey: ['msft-todo-connection', householdId] })
    },
  })
}

export function useDisconnectMsftTodo() {
  const queryClient = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('msft-todo', {
        body: { action: 'disconnect' },
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['msft-todo-connection', householdId] })
      queryClient.invalidateQueries({ queryKey: ['msft-todo-lists', householdId] })
    },
  })
}
