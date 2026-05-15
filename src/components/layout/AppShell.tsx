import { Outlet } from 'react-router-dom'
import { useRealtime } from '@/hooks/useRealtime'

export function AppShell() {
  useRealtime()
  return (
    <div className="min-h-dvh">
      <Outlet />
    </div>
  )
}
