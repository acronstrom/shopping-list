import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ListMode = 'edit' | 'shopping'

interface UIContextValue {
  selectedStoreId: string | null
  setSelectedStoreId: (id: string | null) => void
  mode: ListMode
  setMode: (mode: ListMode) => void
}

const UIContext = createContext<UIContextValue | null>(null)

const MODE_STORAGE_KEY = 'shopping-list:mode'
const STORE_STORAGE_KEY = 'shopping-list:selectedStoreId'

function loadInitialMode(): ListMode {
  if (typeof window === 'undefined') return 'edit'
  const stored = window.localStorage.getItem(MODE_STORAGE_KEY)
  return stored === 'shopping' ? 'shopping' : 'edit'
}

function loadInitialStoreId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(STORE_STORAGE_KEY) || null
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(loadInitialStoreId)
  const [mode, setMode] = useState<ListMode>(loadInitialMode)

  useEffect(() => {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode)
  }, [mode])

  useEffect(() => {
    if (selectedStoreId) window.localStorage.setItem(STORE_STORAGE_KEY, selectedStoreId)
    else window.localStorage.removeItem(STORE_STORAGE_KEY)
  }, [selectedStoreId])

  return (
    <UIContext.Provider value={{ selectedStoreId, setSelectedStoreId, mode, setMode }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
