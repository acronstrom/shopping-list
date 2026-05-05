import { useStores } from '@/hooks/useStores'
import { useUI } from '@/contexts/UIContext'

export function SortControls() {
  const { data: stores = [] } = useStores()
  const { selectedStoreId, setSelectedStoreId } = useUI()

  if (stores.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Sort by store:</span>
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setSelectedStoreId(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            !selectedStoreId
              ? 'bg-green-600 text-white'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Category
        </button>
        {stores.map(store => (
          <button
            key={store.id}
            onClick={() => setSelectedStoreId(store.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedStoreId === store.id
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {store.name}
          </button>
        ))}
      </div>
    </div>
  )
}
