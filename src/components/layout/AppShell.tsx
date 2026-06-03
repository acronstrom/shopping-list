import { Outlet } from 'react-router-dom'
import { useRealtime } from '@/hooks/useRealtime'
import { TabBar } from './TabBar'

export function AppShell() {
  useRealtime()
  return (
    <div className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-2xl pb-28">
        <Outlet />
      </div>
      <TabBar />
    </div>
  )
}
