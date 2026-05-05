import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  user: User | null
  session: Session | null
  householdId: string | null
  isLoading: boolean
  setHouseholdId: (id: string | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (!session) setHouseholdId(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { household_id: string } | null
        setHouseholdId(row?.household_id ?? null)
      })
  }, [user])

  return (
    <AuthContext.Provider value={{ user, session, householdId, isLoading, setHouseholdId }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
