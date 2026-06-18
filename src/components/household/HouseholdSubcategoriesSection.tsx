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
  useHouseholdCategories,
  useHouseholdSubcategories,
  useAddHouseholdSubcategory,
  useDeleteHouseholdSubcategory,
  useReorderHouseholdSubcategories,
} from '@/hooks/useCategories'
import { Spinner } from '@/components/ui/Spinner'
import type { HouseholdSubcategory } from '@/types'

export function HouseholdSubcategoriesSection() {
  const { data: categories = [] } = useHouseholdCategories()
  const { data: subs = [], isLoading } = useHouseholdSubcategories()
  const addSub = useAddHouseholdSubcategory()
  const deleteSub = useDeleteHouseholdSubcategory()
  const reorder = useReorderHouseholdSubcategories()

  const [open, setOpen] = useState(false)
  const [parent, setParent] = useState('')
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const deptNames = useMemo(
    () => categories.map(c => c.name).filter(n => n !== 'Övrigt'),
    [categories]
  )
  const effectiveParent = parent || (deptNames.includes('Skafferi') ? 'Skafferi' : deptNames[0] ?? '')

  const byParent = useMemo(() => {
    const map = new Map<string, HouseholdSubcategory[]>()
    for (const s of [...subs].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))) {
      const arr = map.get(s.parent_category) ?? []
      arr.push(s)
      map.set(s.parent_category, arr)
    }
    return map
  }, [subs])

  const parentsWithSubs = useMemo(
    () => [...byParent.keys()].sort((a, b) => a.localeCompare(b, 'sv')),
    [byParent]
  )

  const isBusy = isLoading || addSub.isPending || deleteSub.isPending || reorder.isPending

  async function handleAdd() {
    setError('')
    const trimmed = newName.trim()
    if (!trimmed || !effectiveParent) return
    try {
      const siblings = byParent.get(effectiveParent) ?? []
      const maxSort = siblings.reduce((m, c) => Math.max(m, c.sort_order ?? 0), 0)
      await addSub.mutateAsync({ parentCategory: effectiveParent, name: trimmed, sortOrder: maxSort + 10 })
      setNewName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att lägga till underkategori')
    }
  }

  async function handleDelete(id: string) {
    setError('')
    try {
      await deleteSub.mutateAsync({ id })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att ta bort underkategori')
    }
  }

  function handleDragEnd(parentName: string, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = (byParent.get(parentName) ?? []).map(s => s.id)
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    if (oldIndex < 0 || newIndex < 0) return
    reorder.mutate(arrayMove(ids, oldIndex, newIndex))
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
            <span className="text-sm font-semibold text-ink">Underkategorier</span>
            <span className="text-xs text-ink-4">{subs.length}</span>
          </span>
          <svg
            className={clsx('w-4 h-4 text-ink-4 transition-transform flex-shrink-0', open && 'rotate-180')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="border-t border-hair p-3 flex flex-col gap-4">
            <p className="text-xs text-ink-3">
              Finkornig indelning inom en avdelning (t.ex. Skafferi → Pasta, Ris). Styr ordningen i butiken och gör kategoriseringen mer träffsäker.
            </p>

            {isLoading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : parentsWithSubs.length === 0 ? (
              <p className="text-sm text-ink-4 py-2 text-center">Inga underkategorier än.</p>
            ) : (
              parentsWithSubs.map(parentName => {
                const list = byParent.get(parentName) ?? []
                const ids = list.map(s => s.id)
                return (
                  <div key={parentName} className="flex flex-col gap-1.5">
                    <p className="text-[12px] font-semibold text-ink-3 uppercase tracking-[0.06em] px-1">{parentName}</p>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(parentName, e)}>
                      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                        <ul className="rounded-xl border border-hair overflow-hidden bg-surface">
                          {list.map((sub, idx) => (
                            <SortableRow
                              key={sub.id}
                              id={sub.id}
                              label={sub.name}
                              last={idx === list.length - 1}
                              onDelete={() => handleDelete(sub.id)}
                              disabled={isBusy}
                            />
                          ))}
                        </ul>
                      </SortableContext>
                    </DndContext>
                  </div>
                )
              })
            )}

            <div className="flex flex-col gap-2">
              <p className="text-[12px] font-medium text-ink-3 px-1">Lägg till underkategori</p>
              <div className="flex gap-2 items-center">
                <select
                  value={effectiveParent}
                  onChange={e => setParent(e.target.value)}
                  className="rounded-[14px] border border-hair px-2.5 py-2 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-clay/30 focus:border-clay-line"
                >
                  {deptNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAdd()
                    }
                  }}
                  placeholder="Ny underkategori…"
                  className="flex-1 min-w-0 rounded-[14px] border border-hair px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-clay/30 focus:border-clay-line transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={isBusy || !newName.trim() || !effectiveParent}
                  className="px-3 py-2 rounded-xl text-sm font-medium bg-clay hover:bg-clay-deep text-white transition-colors disabled:opacity-40"
                >
                  Lägg till
                </button>
              </div>
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
