import { useMemo } from 'react'
import { useGroceries, useClearChecked } from '@/hooks/useGroceries'
import { useStoreCategoryOrders } from '@/hooks/useCategories'
import { useUI } from '@/contexts/UIContext'
import { GroceryItem } from './GroceryItem'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import type { GroceryItem as GroceryItemType } from '@/types'

export function GroceryList() {
  const { data: items = [], isLoading } = useGroceries()
  const { selectedStoreId } = useUI()
  const { data: storeCategoryOrders = [] } = useStoreCategoryOrders(selectedStoreId)
  const clearChecked = useClearChecked()

  const categoryPosition = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of storeCategoryOrders) {
      map.set(row.category_name, row.position)
    }
    return map
  }, [storeCategoryOrders])

  const sortedItems = useMemo(() => {
    if (!selectedStoreId) {
      return [...items].sort((a, b) => {
        if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
        return a.category.localeCompare(b.category, 'sv') || a.name.localeCompare(b.name)
      })
    }
    return [...items].sort((a, b) => {
      if (a.is_checked !== b.is_checked) return a.is_checked ? 1 : -1
      const posA = categoryPosition.get(a.category) ?? 999
      const posB = categoryPosition.get(b.category) ?? 999
      return posA - posB || a.name.localeCompare(b.name)
    })
  }, [items, selectedStoreId, categoryPosition])

  const checkedItems = items.filter(i => i.is_checked)
  const checkedCount = checkedItems.length
  const totalCount = items.length
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

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

  const grouped = selectedStoreId ? null : groupByCategory(sortedItems)

  return (
    <div className="flex flex-col gap-3">
      {totalCount > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-gray-200/70 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 font-medium tabular-nums whitespace-nowrap">
              {checkedCount}/{totalCount}
            </span>
          </div>
          {checkedCount > 0 && (
            <button
              onClick={() => clearChecked.mutate(checkedItems)}
              disabled={clearChecked.isPending}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              Rensa markerade
            </button>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 overflow-hidden divide-y divide-gray-100/80">
        {grouped
          ? Object.entries(grouped).map(([category, catItems]) => (
              <div key={category}>
                <div className="px-4 py-2 bg-gray-50/80">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {category}
                  </span>
                </div>
                {catItems.map(item => (
                  <GroceryItem key={item.id} item={item} />
                ))}
              </div>
            ))
          : sortedItems.map(item => (
              <GroceryItem key={item.id} item={item} showAisle={false} />
            ))}
      </div>
    </div>
  )
}

function groupByCategory(items: GroceryItemType[]) {
  return items.reduce<Record<string, GroceryItemType[]>>((acc, item) => {
    const cat = item.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})
}
