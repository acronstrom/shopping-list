import { useState } from 'react'
import { useDeleteStore } from '@/hooks/useStores'
import { StoreCategoryOrderEditor } from './StoreCategoryOrderEditor'
import type { Store } from '@/types'

interface Props {
  store: Store
}

export function StoreCard({ store }: Props) {
  const [expanded, setExpanded] = useState(false)
  const deleteStore = useDeleteStore()

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🏪</span>
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{store.name}</p>
            <p className="text-xs text-gray-400">Tryck för att {expanded ? 'dölja' : 'redigera'} gångnummer</p>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          onClick={() => deleteStore.mutate(store.id)}
          disabled={deleteStore.isPending}
          className="ml-2 p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Ta bort butik"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-2">
          <p className="text-xs text-gray-400 mb-3">
            Välj i vilken ordning kategorierna ska visas/sorteras i den här butiken.
          </p>
          <StoreCategoryOrderEditor storeId={store.id} />
        </div>
      )}
    </div>
  )
}
