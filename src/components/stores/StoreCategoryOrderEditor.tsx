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
  useStoreCategoryMap,
  useSetStoreCategoryMapping,
  useApplyStorePreset,
} from '@/hooks/useCategories'
import { STORE_PRESETS } from '@/lib/storePresets'

interface Props {
  storeId: string
}

export function StoreCategoryOrderEditor({ storeId }: Props) {
  const { data: householdCategories = [], isLoading: loadingCats } = useHouseholdCategories()
  const { data: storeOrders = [], isLoading: loadingOrder } = useStoreCategoryOrders(storeId)
  const { data: storeMap = [] } = useStoreCategoryMap(storeId)
  const setOrder = useSetStoreCategoryOrder()
  const addStoreCategory = useAddStoreCategory()
  const removeStoreCategory = useRemoveStoreCategory()
  const resetCategories = useResetStoreCategoriesToHousehold()
  const setMapping = useSetStoreCategoryMapping()
  const applyPreset = useApplyStorePreset()
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmPreset, setConfirmPreset] = useState<string | null>(null)

  const sectionByCategory = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of storeMap) map.set(row.household_category, row.store_section)
    return map
  }, [storeMap])

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
    resetCategories.isPending ||
    setMapping.isPending ||
    applyPreset.isPending

  if (loadingCats || loadingOrder) {
    return <p className="text-sm text-ink-4 py-4 text-center">Laddar kategorier…</p>
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

  async function handleApplyPreset(presetId: string) {
    setError('')
    setConfirmPreset(null)
    const preset = STORE_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    try {
      await applyPreset.mutateAsync({ storeId, preset })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att använda mallen')
    }
  }

  async function handleSetMapping(householdCategory: string, storeSection: string) {
    setError('')
    if (!storeSection) return
    try {
      await setMapping.mutateAsync({ storeId, householdCategory, storeSection })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att spara kopplingen')
    }
  }

  return (
    <div>
      <p className="text-[11px] text-ink-4 mb-2 select-none">
        Dra för att ändra ordningen. Lägg till eller ta bort kategorier som inte passar i den här butiken.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {STORE_PRESETS.map(p =>
          confirmPreset === p.id ? (
            <span key={p.id} className="inline-flex items-center gap-2 text-xs">
              <span className="text-ink-2">Ersätt butikens kategorier med {p.label}-mallen?</span>
              <button
                type="button"
                onClick={() => handleApplyPreset(p.id)}
                disabled={isBusy}
                className="px-2.5 py-1 rounded-[10px] bg-clay text-white font-medium hover:bg-clay-deep disabled:opacity-40"
              >
                Ja
              </button>
              <button
                type="button"
                onClick={() => setConfirmPreset(null)}
                className="px-2.5 py-1 rounded-[10px] text-ink-2 hover:bg-surface-2"
              >
                Avbryt
              </button>
            </span>
          ) : (
            <button
              key={p.id}
              type="button"
              onClick={() => setConfirmPreset(p.id)}
              disabled={isBusy}
              className="px-3 py-1.5 rounded-full border border-hair text-xs font-medium text-ink-2 hover:bg-surface-2 disabled:opacity-40"
            >
              Använd {p.label}-mall
            </button>
          )
        )}
      </div>

      {usingFallback && (
        <p className="text-[11px] text-clay-deep bg-clay-tint rounded-[10px] px-2.5 py-1.5 mb-2">
          Den här butiken har inga egna kategorier än. Visar hushållets standardlista — gör en ändring så sparas en egen lista för butiken.
        </p>
      )}

      {orderedCategoryNames.length === 0 ? (
        <p className="text-sm text-ink-4 py-4 text-center">Inga kategorier än.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedCategoryNames} strategy={verticalListSortingStrategy}>
            <ul className="rounded-[14px] border border-hair overflow-hidden bg-surface">
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
          className="flex-1 rounded-[14px] border border-hair px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-clay/30 focus:border-clay-line transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isBusy || !newCategory.trim()}
          className="px-3 py-2 rounded-[12px] text-sm font-medium bg-clay hover:bg-clay-deep text-white transition-colors disabled:opacity-40"
        >
          Lägg till
        </button>
      </div>

      <div className="mt-3">
        {confirmReset ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink-2">Ersätt butikens lista med hushållets standard?</span>
            <button
              type="button"
              onClick={handleReset}
              disabled={isBusy}
              className="px-2.5 py-1 rounded-[10px] bg-clay text-white font-medium hover:bg-clay-deep disabled:opacity-40"
            >
              Ja, återställ
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-2.5 py-1 rounded-[10px] text-ink-2 hover:bg-surface-2"
            >
              Avbryt
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            disabled={isBusy || householdCategories.length === 0}
            className="text-xs text-ink-3 hover:text-ink underline decoration-dotted disabled:opacity-40"
          >
            Återställ till hushållets standard
          </button>
        )}
      </div>

      {householdCategories.length > 0 && orderedCategoryNames.length > 0 && (
        <div className="mt-5">
          <p className="text-[12px] font-semibold text-ink-3 uppercase tracking-[0.06em] mb-1">
            Koppling till sektioner
          </p>
          <p className="text-[11px] text-ink-4 mb-2">
            Vilken sektion varje generisk kategori hamnar i när du handlar i den här butiken.
          </p>
          <ul className="rounded-[14px] border border-hair overflow-hidden bg-surface divide-y divide-hair-2">
            {householdCategories.map(cat => (
              <li key={cat.id} className="flex items-center gap-2 px-3 py-2">
                <span className="text-sm text-ink flex-1 truncate">{cat.name}</span>
                <select
                  value={sectionByCategory.get(cat.name) ?? ''}
                  onChange={e => handleSetMapping(cat.name, e.target.value)}
                  disabled={isBusy}
                  className="rounded-[10px] border border-hair px-2 py-1.5 text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:ring-clay/30 max-w-[55%] disabled:opacity-40"
                >
                  <option value="">(samma namn)</option>
                  {orderedCategoryNames.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-rose bg-rose-tint rounded-[12px] px-3 py-2">{error}</p>}
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
      <span className="text-xs font-medium text-ink-4 tabular-nums w-6 text-right select-none">
        {position}
      </span>
      <span className="text-sm text-ink flex-1 truncate select-none">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Ta bort ${label} från butiken`}
        className="p-1.5 rounded-lg text-ink-4 hover:text-rose hover:bg-rose-tint transition-colors disabled:opacity-40"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  )
}
