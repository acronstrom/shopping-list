import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { UIProvider } from '@/contexts/UIContext'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'
import { HouseholdSetup } from '@/components/household/HouseholdSetup'
import { ShoppingListPage } from '@/pages/ShoppingListPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { SettingsPage } from '@/pages/SettingsPage'

function AppRoutes() {
  const { householdId, isLoading } = useAuth()

  if (isLoading) return null
  if (!householdId) return <HouseholdSetup />

  return (
    <UIProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<ShoppingListPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </UIProvider>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AuthGuard>
            <AppRoutes />
          </AuthGuard>
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
