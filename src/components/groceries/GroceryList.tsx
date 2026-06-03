import { useMemo, useState } from 'react'
import { useGroceries, useClearChecked } from '@/hooks/useGroceries'
import { useStoreCategoryOrders } from '@/hooks/useCategories'
import { useUI } from '@/contexts/UIContext'
import { GroceryItem } from './GroceryItem'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Group, GroupHeader } from '@/components/ui/Group'
import { Dot } from '@/components/ui/Dot'
import { Check, ChevronDown } from '@/lib/icons'
import { clsx } from 'clsx'
import type { GroceryItem as GroceryItemType } from '@/types'

export function GroceryList() {
  const { data: items = [], isLoading } = useGroceries()
  const { selectedStoreId, mode } = useUI()
  const { data: storeCategoryOrders = [] } = useStoreCategoryOrders(selectedStoreId)
  const clearChecked = useClearChecked()
  const [showChecked, setShowChecked] = useState(false)
  const isShopping = mode === 'shopping'

  const categoryPosition = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of storeCategoryOrders) map.set(row.category_name, row.position)
    return map
  }, [storeCategoryOrders])

  const checkedItems = useMemo(() => items.filter(i => i.is_checked), [items])
  const checkedCount = checkedItems.length
  const totalCount = items.length
  const remaining = totalCount - checkedCount
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  // Items shown in the grouped list: everything in edit, only unchecked in shop.
  const visibleItems = useMemo(
    () => (isShopping ? items.filter(i => !i.is_checked) : items),
    [items, isShopping]
  )

  const orderedGroups = useMemo(() => {
    const buckets = new Map<string, GroceryItemType[]>()
    for (const item of visibleItems) {
      const cat = item.category
      if (!buckets.has(cat)) buckets.set(cat, [])
      buckets.get(cat)!.push(item)
    }
    for (const list of buckets.values()) {
      list.sort((a, b) => {
        if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
        return a.name.localeCompare(b.name, 'sv')
      })
    }
    return [...buckets.entries()].sort((a, b) => {
      if (selectedStoreId) {
        const pa = categoryPosition.get(a[0]) ?? 999
        const pb = categoryPosition.get(b[0]) ?? 999
        if (pa !== pb) return pa - pb
      }
      return a[0].localeCompare(b[0], 'sv')
    })
  }, [visibleItems, selectedStoreId, categoryPosition])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="Din lista är tom"
        description="Lägg till varor ovan så visas de här, sorterade efter kategori eller butiksled."
      />
    )
  }

  const allDone = isShopping && totalCount > 0 && visibleItems.length === 0

  return (
    <div className="flex flex-col gap-[18px]">
      {/* Summary */}
      {isShopping ? (
        <div className="flex items-center gap-3.5">
          <ProgressRing progress={progress} label={String(remaining)} />
          <div>
            <div className="font-serif text-[21px] font-medium tracking-[-0.01em] text-ink">
              {remaining} kvar att handla
            </div>
            <div className="text-sm text-ink-3 mt-0.5">
              {checkedCount} i kundvagnen{selectedStoreId ? ' · sorterat efter gång' : ''}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">
              <b className="font-semibold text-ink">{totalCount} varor</b> · {checkedCount} i kundvagnen
            </span>
            {checkedCount > 0 && (
              <button
                onClick={() => clearChecked.mutate(checkedItems)}
                disabled={clearChecked.isPending}
                className="text-[13px] font-medium text-clay-deep hover:opacity-80 disabled:opacity-50"
              >
                Rensa markerade
              </button>
            )}
          </div>
          <div className="h-1 rounded-full bg-hair overflow-hidden">
            <div
              className="h-full rounded-full bg-clay transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {allDone ? (
        <div className="rounded-group bg-surface border border-hair shadow-card px-4 py-10 text-center">
          <p className="font-serif text-[20px] text-ink mb-1">Allt avbockat</p>
          <p className="text-sm text-ink-3">Tryck "Rensa markerade" när du är klar.</p>
        </div>
      ) : (
        orderedGroups.map(([category, catItems]) => (
          <div key={category} className="flex flex-col">
            <GroupHeader>
              <Dot category={category} />
              {category}
            </GroupHeader>
            <Group divider>
              {catItems.map(item => (
                <GroceryItem key={item.id} item={item} showAisle={false} />
              ))}
            </Group>
          </div>
        ))
      )}

      {/* Collapsed checked (shop mode) */}
      {isShopping && checkedCount > 0 && (
        <div className="flex flex-col">
          <button
            onClick={() => setShowChecked(v => !v)}
            className="flex items-center justify-between rounded-[14px] border border-hair bg-transparent px-4 py-3.5 text-ink-2"
          >
            <span className="flex items-center gap-2.5 text-[15px]">
              <span className="w-[22px] h-[22px] rounded-full bg-clay text-white grid place-items-center">
                <Check size={13} />
              </span>
              {checkedCount} i kundvagnen
            </span>
            <ChevronDown size={18} className={clsx('text-ink-4 transition-transform', showChecked && 'rotate-180')} />
          </button>
          {showChecked && (
            <Group divider className="mt-2">
              {checkedItems.map(item => (
                <GroceryItem key={item.id} item={item} showAisle={false} />
              ))}
            </Group>
          )}
        </div>
      )}
    </div>
  )
}

function ProgressRing({ progress, label }: { progress: number; label: string }) {
  const r = 24
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - progress / 100)
  return (
    <div className="relative w-14 h-14 flex-none">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--color-hair)" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke="var(--color-clay)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 28 28)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-serif text-[15px] font-semibold text-ink">
        {label}
      </div>
    </div>
  )
}
