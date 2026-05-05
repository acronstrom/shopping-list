import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useRealtime } from '@/hooks/useRealtime'

export function AppShell() {
  useRealtime()
  return (
    <div className="min-h-dvh bg-gray-50 pb-20 md:pb-6">
      <Outlet />
      <BottomNav />
    </div>
  )
}
