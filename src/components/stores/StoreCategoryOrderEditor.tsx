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
  useAddHouseholdCategory,
  useHouseholdCategories,
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
  const addCategory = useAddHouseholdCategory()
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const orderedCategoryNames = useMemo(() => {
    const names = householdCategories.map(c => c.name)
    if (names.length === 0) return []
    const byName = new Set(names)
    const existing = storeOrders.map(o => o.category_name).filter(n => byName.has(n))
    const missing = names.filter(n => !existing.includes(n))
    return [...existing, ...missing]
  }, [householdCategories, storeOrders])

  const isBusy = loadingCats || loadingOrder || setOrder.isPending || addCategory.isPending

  if (loadingCats) {
    return <p className="text-sm text-gray-400 py-4 text-center">Laddar kategorier…</p>
  }

  if (householdCategories.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        Inga kategorier definierade än. Lägg till kategorier i inställningar först.
      </p>
    )
  }

  async function persist(nextNames: string[]) {
    await setOrder.mutateAsync({ storeId, orderedCategoryNames: nextNames })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedCategoryNames.indexOf(active.id as string)
    const newIndex = orderedCategoryNames.indexOf(over.id as string)
    if (oldIndex < 0 || newIndex < 0) return
    persist(arrayMove(orderedCategoryNames, oldIndex, newIndex))
  }

  async function handleAdd() {
    setError('')
    const trimmed = newCategory.trim()
    if (!trimmed) return
    try {
      await addCategory.mutateAsync({ name: trimmed, sortOrder: orderedCategoryNames.length })
      setNewCategory('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att lägga till kategori')
    }
  }

  return (
    <div>
      <p className="text-[11px] text-gray-400 mb-2 select-none">
        Dra för att ändra ordningen — överst hamnar först i listan.
      </p>
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
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="mt-4 flex gap-2">
        <input
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
          placeholder="Ny kategori…"
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
      {error && <p className="mt-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </div>
  )
}

interface RowProps {
  id: string
  label: string
  position: number
  last: boolean
}

function SortableRow({ id, label, position, last }: RowProps) {
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
    </li>
  )
}
