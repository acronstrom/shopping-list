import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useRealtime } from '@/hooks/useRealtime'

export function AppShell() {
  useRealtime()
  return (
    <div className="min-h-dvh pb-24 md:pb-8">
      <Outlet />
      <BottomNav />
    </div>
  )
}
