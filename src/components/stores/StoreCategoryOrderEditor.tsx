import { useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { clsx } from 'clsx'
import {
  useAddStoreCategory,
  useHouseholdCategories,
  useRemoveStoreCategory,
  useResetStoreCategoriesToHousehold,
  useSetStoreCategoryOrder,
  useStoreCategoryOrders,
} from '@/hooks/useCategories'

interface Props {
  storeId: string
}

export function StoreCategoryOrderEditor({ storeId }: Props) {
  const { data: householdCategories = [], isLoading: loadingCats } = useHouseholdCategories()
  const { data: storeOrders = [], isLoading: loadingOrder } = useStoreCategoryOrders(storeId)
  const setOrder = useSetStoreCategoryOrder()
  const addStoreCategory = useAddStoreCategory()
  const removeStoreCategory = useRemoveStoreCategory()
  const resetCategories = useResetStoreCategoriesToHousehold()
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // The store's category list is authoritative — what's in store_category_orders.
  // For older stores that haven't been seeded yet (or had every category removed)
  // we fall back to displaying the household defaults so the editor isn't empty
  // until the user explicitly acts.
  const orderedCategoryNames = useMemo(() => {
    if (storeOrders.length > 0) {
      return [...storeOrders]
        .sort((a, b) => a.position - b.position || a.category_name.localeCompare(b.category_name))
        .map(o => o.category_name)
    }
    return householdCategories.map(c => c.name)
  }, [storeOrders, householdCategories])

  const usingFallback = storeOrders.length === 0 && householdCategories.length > 0
  const isBusy =
    loadingCats ||
    loadingOrder ||
    setOrder.isPending ||
    addStoreCategory.isPending ||
    removeStoreCategory.isPending ||
    resetCategories.isPending

  if (loadingCats || loadingOrder) {
    return <p className="text-sm text-gray-400 py-4 text-center">Laddar kategorier…</p>
  }

  async function persistOrder(nextNames: string[]) {
    await setOrder.mutateAsync({ storeId, orderedCategoryNames: nextNames })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedCategoryNames.indexOf(active.id as string)
    const newIndex = orderedCategoryNames.indexOf(over.id as string)
    if (oldIndex < 0 || newIndex < 0) return
    persistOrder(arrayMove(orderedCategoryNames, oldIndex, newIndex))
  }

  async function handleAdd() {
    setError('')
    const trimmed = newCategory.trim()
    if (!trimmed) return
    try {
      await addStoreCategory.mutateAsync({ storeId, name: trimmed })
      setNewCategory('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att lägga till kategori')
    }
  }

  async function handleRemove(name: string) {
    setError('')
    try {
      await removeStoreCategory.mutateAsync({ storeId, name })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att ta bort kategori')
    }
  }

  async function handleReset() {
    setError('')
    setConfirmReset(false)
    try {
      await resetCategories.mutateAsync(storeId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att återställa')
    }
  }

  return (
    <div>
      <p className="text-[11px] text-gray-400 mb-2 select-none">
        Dra för att ändra ordningen. Lägg till eller ta bort kategorier som inte passar i den här butiken.
      </p>

      {usingFallback && (
        <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5 mb-2">
          Den här butiken har inga egna kategorier än. Visar hushållets standardlista — gör en ändring så sparas en egen lista för butiken.
        </p>
      )}

      {orderedCategoryNames.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Inga kategorier än.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedCategoryNames} strategy={verticalListSortingStrategy}>
            <ul className="rounded-xl border border-gray-200/70 overflow-hidden bg-white">
              {orderedCategoryNames.map((name, idx) => (
                <SortableRow
                  key={name}
                  id={name}
                  label={name}
                  position={idx + 1}
                  last={idx === orderedCategoryNames.length - 1}
                  onRemove={() => handleRemove(name)}
                  disabled={isBusy}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
          placeholder="Ny kategori i den här butiken…"
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isBusy || !newCategory.trim()}
          className="px-3 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors disabled:opacity-40"
        >
          Lägg till
        </button>
      </div>

      <div className="mt-3">
        {confirmReset ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-600">Ersätt butikens lista med hushållets standard?</span>
            <button
              type="button"
              onClick={handleReset}
              disabled={isBusy}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-40"
            >
              Ja, återställ
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-2.5 py-1 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              Avbryt
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            disabled={isBusy || householdCategories.length === 0}
            className="text-xs text-gray-500 hover:text-gray-700 underline decoration-dotted disabled:opacity-40"
          >
            Återställ till hushållets standard
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </div>
  )
}

interface RowProps {
  id: string
  label: string
  position: number
  last: boolean
  onRemove: () => void
  disabled: boolean
}

function SortableRow({ id, label, position, last, onRemove, disabled }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={clsx(
        'flex items-center gap-2 px-2 py-2 bg-white',
        !last && 'border-b border-gray-100',
        isDragging && 'relative z-10 shadow-lg ring-1 ring-emerald-200 bg-emerald-50/40'
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Dra för att flytta ${label}`}
        className="p-2 -m-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 cursor-grab active:cursor-grabbing touch-none"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <circle cx="7" cy="5" r="1.5" />
          <circle cx="13" cy="5" r="1.5" />
          <circle cx="7" cy="10" r="1.5" />
          <circle cx="13" cy="10" r="1.5" />
          <circle cx="7" cy="15" r="1.5" />
          <circle cx="13" cy="15" r="1.5" />
        </svg>
      </button>
      <span className="text-xs font-medium text-gray-400 tabular-nums w-6 text-right select-none">
        {position}
      </span>
      <span className="text-sm text-gray-800 flex-1 truncate select-none">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Ta bort ${label} från butiken`}
        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  )
}
