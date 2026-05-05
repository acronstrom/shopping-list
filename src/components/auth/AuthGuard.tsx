import { type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AuthPage } from './AuthPage'
import { Spinner } from '@/components/ui/Spinner'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) return <AuthPage />

  return <>{children}</>
}
