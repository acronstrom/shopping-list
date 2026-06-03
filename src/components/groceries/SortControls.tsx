import { useStores } from '@/hooks/useStores'
import { useUI } from '@/contexts/UIContext'
import { clsx } from 'clsx'

export function SortControls() {
  const { data: stores = [] } = useStores()
  const { selectedStoreId, setSelectedStoreId } = useUI()

  if (stores.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto -mx-[18px] px-[18px] pb-0.5">
      <Chip active={!selectedStoreId} onClick={() => setSelectedStoreId(null)}>
        Kategori
      </Chip>
      {stores.map(store => (
        <Chip
          key={store.id}
          active={selectedStoreId === store.id}
          onClick={() => setSelectedStoreId(store.id)}
        >
          {store.name}
        </Chip>
      ))}
    </div>
  )
}

function Chip({
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
        'flex-none px-[13px] py-[7px] rounded-full text-[13px] font-medium border whitespace-nowrap transition-all active:scale-95',
        active
          ? 'bg-ink text-paper border-ink'
          : 'bg-surface text-ink-2 border-hair hover:bg-surface-2'
      )}
    >
      {children}
    </button>
  )
}
