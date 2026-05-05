import { createContext, useContext, useState, type ReactNode } from 'react'

interface UIContextValue {
  selectedStoreId: string | null
  setSelectedStoreId: (id: string | null) => void
}

const UIContext = createContext<UIContextValue | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)
  return (
    <UIContext.Provider value={{ selectedStoreId, setSelectedStoreId }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
