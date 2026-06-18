import { useMemo, useState } from 'react'
import { useGroceries, useClearChecked } from '@/hooks/useGroceries'
import { useStoreCategoryOrders, useHouseholdSubcategories, useStoreCategoryMap } from '@/hooks/useCategories'
import { useUI } from '@/contexts/UIContext'
import { GroceryItem } from './GroceryItem'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Group, GroupHeader } from '@/components/ui/Group'
import { Dot } from '@/components/ui/Dot'
import { Check, ChevronDown } from '@/lib/icons'
import { clsx } from 'clsx'
import type { GroceryItem as GroceryItemType } from '@/types'

interface SubSection {
  name: string | null
  items: GroceryItemType[]
}

// Split a department's items into aisle sub-sections by subcategory, in the
// given order, with un-subcategorized items last. Returns null when the
// department has no subcategories or no item uses one — render flat in that case.
function splitBySubcategory(catItems: GroceryItemType[], subOrder: string[] | undefined): SubSection[] | null {
  if (!subOrder || subOrder.length === 0) return null
  const bySub = new Map<string, GroceryItemType[]>()
  const noSub: GroceryItemType[] = []
  for (const item of catItems) {
    if (item.subcategory && subOrder.includes(item.subcategory)) {
      const arr = bySub.get(item.subcategory) ?? []
      arr.push(item)
      bySub.set(item.subcategory, arr)
    } else {
      noSub.push(item)
    }
  }
  const sections: SubSection[] = []
  for (const sub of subOrder) {
    const its = bySub.get(sub)
    if (its && its.length > 0) sections.push({ name: sub, items: its })
  }
  if (noSub.length > 0) sections.push({ name: null, items: noSub })
  // Nothing actually used a subcategory → let the caller render flat.
  if (sections.length === 1 && sections[0].name === null) return null
  return sections
}

export function GroceryList() {
  const { data: items = [], isLoading } = useGroceries()
  const { selectedStoreId, mode } = useUI()
  const { data: storeCategoryOrders = [] } = useStoreCategoryOrders(selectedStoreId)
  const { data: storeCategoryMap = [] } = useStoreCategoryMap(selectedStoreId)
  const { data: subcategories = [] } = useHouseholdSubcategories()
  const clearChecked = useClearChecked()
  const [showChecked, setShowChecked] = useState(false)
  const isShopping = mode === 'shopping'

  const categoryPosition = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of storeCategoryOrders) map.set(row.category_name, row.position)
    return map
  }, [storeCategoryOrders])

  // Store "lens": when a store is selected and it defines a generic->section
  // mapping, group items by store section instead of by their generic category.
  const useLens = !!selectedStoreId && storeCategoryMap.length > 0
  const categoryToSection = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of storeCategoryMap) map.set(row.household_category, row.store_section)
    return map
  }, [storeCategoryMap])
  // A section's dot colour follows the first generic category mapped into it.
  const sectionDotCategory = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of storeCategoryMap) {
      if (!map.has(row.store_section)) map.set(row.store_section, row.household_category)
    }
    return map
  }, [storeCategoryMap])
  const sectionFor = (category: string) =>
    useLens ? categoryToSection.get(category) ?? category : category

  // All subcategory names in a stable per-department order. Drives the aisle
  // sub-sections inside a group regardless of whether the group key is a generic
  // category or a store section.
  const allSubOrder = useMemo(
    () =>
      [...subcategories]
        .sort(
          (a, b) =>
            a.parent_category.localeCompare(b.parent_category, 'sv') ||
            a.sort_order - b.sort_order ||
            a.name.localeCompare(b.name, 'sv'),
        )
        .map(s => s.name),
    [subcategories]
  )

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
      const key = sectionFor(item.category)
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key)!.push(item)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItems, selectedStoreId, categoryPosition, categoryToSection, useLens])

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
        orderedGroups.map(([groupKey, catItems]) => {
          const sections = splitBySubcategory(catItems, allSubOrder)
          return (
            <div key={groupKey} className="flex flex-col">
              <GroupHeader>
                <Dot category={sectionDotCategory.get(groupKey) ?? groupKey} />
                {groupKey}
              </GroupHeader>
              {sections ? (
                <div className="flex flex-col gap-2.5">
                  {sections.map(sec => (
                    <div key={sec.name ?? '__none'} className="flex flex-col">
                      {sec.name && (
                        <div className="px-1.5 pb-1 text-[12px] font-medium text-ink-4">{sec.name}</div>
                      )}
                      <Group divider>
                        {sec.items.map(item => (
                          <GroceryItem key={item.id} item={item} showAisle={false} />
                        ))}
                      </Group>
                    </div>
                  ))}
                </div>
              ) : (
                <Group divider>
                  {catItems.map(item => (
                    <GroceryItem key={item.id} item={item} showAisle={false} />
                  ))}
                </Group>
              )}
            </div>
          )
        })
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
