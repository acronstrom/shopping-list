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
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [isHouseholdLoading, setIsHouseholdLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsSessionLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (!session) setHouseholdId(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Keyed on the id, not the user object: a token refresh hands us a fresh
  // object for the same person and must not re-run the lookup.
  const userId = user?.id ?? null

  useEffect(() => {
    if (!userId) {
      setIsHouseholdLoading(false)
      return
    }

    let cancelled = false
    setIsHouseholdLoading(true)

    supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: true })
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('[AuthContext] household lookup failed', error)
        const row = (data ?? [])[0] as { household_id: string } | undefined
        setHouseholdId(row?.household_id ?? null)
        setIsHouseholdLoading(false)
      })

    return () => { cancelled = true }
  }, [userId])

  // Stay on the spinner until we know whether a signed-in user has a household.
  // Releasing earlier renders HouseholdSetup for a frame on every cold start.
  const isLoading = isSessionLoading || (!!userId && isHouseholdLoading)

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
