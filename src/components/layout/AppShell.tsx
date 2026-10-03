import { Outlet } from 'react-router-dom'
import { useRealtime } from '@/hooks/useRealtime'
import { useAutoSyncMsftTodo } from '@/hooks/useAutoSyncMsftTodo'
import { TabBar } from './TabBar'
import { Sidebar } from './Sidebar'

export function AppShell() {
  useRealtime()
  useAutoSyncMsftTodo()
  return (
    <div className="min-h-dvh bg-paper lg:flex">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <div className="mx-auto max-w-2xl pb-28 lg:max-w-5xl lg:pb-12">
          <Outlet />
        </div>
      </div>
      <TabBar />
    </div>
  )
}
