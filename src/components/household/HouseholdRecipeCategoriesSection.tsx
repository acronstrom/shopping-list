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
  useAddHouseholdRecipeCategory,
  useDeleteHouseholdRecipeCategory,
  useHouseholdRecipeCategories,
  useReorderHouseholdRecipeCategories,
} from '@/hooks/useRecipeCategories'
import { Spinner } from '@/components/ui/Spinner'

export function HouseholdRecipeCategoriesSection() {
  const { data: categories = [], isLoading } = useHouseholdRecipeCategories()
  const addCategory = useAddHouseholdRecipeCategory()
  const deleteCategory = useDeleteHouseholdRecipeCategory()
  const reorder = useReorderHouseholdRecipeCategories()

  const [open, setOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const orderedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
      return a.name.localeCompare(b.name)
    })
  }, [categories])

  const orderedIds = useMemo(() => orderedCategories.map(c => c.id), [orderedCategories])
  const isBusy = isLoading || addCategory.isPending || deleteCategory.isPending || reorder.isPending

  async function handleAdd() {
    setError('')
    const trimmed = newCategory.trim()
    if (!trimmed) return
    try {
      const maxSort = orderedCategories.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0)
      await addCategory.mutateAsync({ name: trimmed, sortOrder: maxSort + 10 })
      setNewCategory('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att lägga till kategori')
    }
  }

  async function handleDelete(id: string) {
    setError('')
    try {
      await deleteCategory.mutateAsync({ id })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att ta bort kategori')
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedIds.indexOf(active.id as string)
    const newIndex = orderedIds.indexOf(over.id as string)
    if (oldIndex < 0 || newIndex < 0) return
    reorder.mutate(arrayMove(orderedIds, oldIndex, newIndex))
  }

  return (
    <section>
      <div className="bg-surface rounded-group shadow-card border border-hair overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-surface-2 transition-colors text-left"
          aria-expanded={open}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-ink">Receptkategorier</span>
            <span className="text-xs text-ink-4">{categories.length}</span>
          </span>
          <svg
            className={clsx('w-4 h-4 text-ink-4 transition-transform flex-shrink-0', open && 'rotate-180')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="border-t border-hair p-3 flex flex-col gap-3">
            <p className="text-xs text-ink-3">
              Recept sorteras under dessa kategorier. Nya recept får automatiskt en passande kategori.
            </p>

            {isLoading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : orderedCategories.length === 0 ? (
              <p className="text-sm text-ink-4 py-3 text-center">Inga kategorier än.</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                  <ul className="rounded-xl border border-hair overflow-hidden bg-surface">
                    {orderedCategories.map((cat, idx) => (
                      <SortableRow
                        key={cat.id}
                        id={cat.id}
                        label={cat.name}
                        last={idx === orderedCategories.length - 1}
                        onDelete={() => handleDelete(cat.id)}
                        disabled={isBusy}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}

            <div className="flex gap-2 items-center">
              <input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAdd()
                  }
                }}
                placeholder="Ny receptkategori…"
                className="flex-1 rounded-[14px] border border-hair px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-clay/30 focus:border-clay-line transition-colors"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={isBusy || !newCategory.trim()}
                className="px-3 py-2 rounded-xl text-sm font-medium bg-clay hover:bg-clay-deep text-white transition-colors disabled:opacity-40"
              >
                Lägg till
              </button>
            </div>

            {error && <p className="text-sm text-rose bg-rose-tint rounded-[12px] px-3 py-2">{error}</p>}
          </div>
        )}
      </div>
    </section>
  )
}

interface RowProps {
  id: string
  label: string
  last: boolean
  onDelete: () => void
  disabled: boolean
}

function SortableRow({ id, label, last, onDelete, disabled }: RowProps) {
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
        'flex items-center gap-2 px-2 py-2 bg-surface',
        !last && 'border-b border-hair-2',
        isDragging && 'relative z-10 shadow-lg ring-1 ring-clay-line bg-clay-tint'
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Dra för att flytta ${label}`}
        className="p-2 -m-1 rounded-lg text-ink-4 hover:text-ink-2 hover:bg-surface-2 cursor-grab active:cursor-grabbing touch-none"
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
      <span className="text-sm text-ink flex-1 truncate select-none">{label}</span>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Ta bort ${label}`}
        className="p-1.5 rounded-lg text-ink-4 hover:text-rose hover:bg-rose-tint transition-colors disabled:opacity-40"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  )
}
