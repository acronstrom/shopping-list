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

  const grouped = selectedStoreId
    ? null
    : groupByCategory(sortedItems)

  return (
    <div>
      {checkedItems.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-xs text-gray-400 font-medium">
            {checkedItems.length} {checkedItems.length === 1 ? 'vara markerad' : 'varor markerade'}
          </span>
          <button
            onClick={() => clearChecked.mutate(checkedItems)}
            disabled={clearChecked.isPending}
            className="text-xs font-medium text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
          >
            Rensa markerade
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
        {grouped
          ? Object.entries(grouped).map(([category, catItems]) => (
              <div key={category}>
                <div className="px-4 py-2 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {category}
                  </span>
                </div>
                {catItems.map(item => (
                  <GroceryItem
                    key={item.id}
                    item={item}
                  />
                ))}
              </div>
            ))
          : sortedItems.map(item => (
              <GroceryItem
                key={item.id}
                item={item}
                showAisle={false}
              />
            ))
        }
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
