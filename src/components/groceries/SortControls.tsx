import { useStores } from '@/hooks/useStores'
import { useUI } from '@/contexts/UIContext'
import { clsx } from 'clsx'

export function SortControls() {
  const { data: stores = [] } = useStores()
  const { selectedStoreId, setSelectedStoreId } = useUI()

  if (stores.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Sortera efter:</span>
      <div className="flex gap-1.5 flex-wrap">
        <Pill active={!selectedStoreId} onClick={() => setSelectedStoreId(null)}>
          Kategori
        </Pill>
        {stores.map(store => (
          <Pill
            key={store.id}
            active={selectedStoreId === store.id}
            onClick={() => setSelectedStoreId(store.id)}
          >
            {store.name}
          </Pill>
        ))}
      </div>
    </div>
  )
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 active:scale-95',
        active
          ? 'bg-gray-900 text-white shadow-sm'
          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      )}
    >
      {children}
    </button>
  )
}
