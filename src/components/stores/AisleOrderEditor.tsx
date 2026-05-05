import { useCallback, useRef } from 'react'
import { useGroceries } from '@/hooks/useGroceries'
import { useAisleOrders, useUpsertAisleOrder } from '@/hooks/useAisleOrders'

interface Props {
  storeId: string
}

export function AisleOrderEditor({ storeId }: Props) {
  const { data: groceries = [] } = useGroceries()
  const { data: aisleOrders = [] } = useAisleOrders(storeId)
  const upsert = useUpsertAisleOrder()
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const aisleMap = new Map(aisleOrders.map(ao => [ao.item_name, ao.aisle]))

  const uniqueNames = Array.from(new Set(groceries.map(g => g.name.toLowerCase().trim()))).sort()

  const handleChange = useCallback((itemName: string, value: string) => {
    const aisle = parseInt(value, 10)
    if (isNaN(aisle) || aisle < 0) return
    clearTimeout(timers.current[itemName])
    timers.current[itemName] = setTimeout(() => {
      upsert.mutate({ storeId, itemName, aisle })
    }, 600)
  }, [storeId, upsert])

  if (uniqueNames.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        Lägg till varor i din lista först, tilldela sedan gångnummer här.
      </p>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {uniqueNames.map(itemName => (
        <div key={itemName} className="flex items-center justify-between py-2.5 px-1">
          <span className="text-sm text-gray-700 capitalize">{itemName}</span>
          <input
            type="number"
            min="0"
            max="999"
            defaultValue={aisleMap.get(itemName) ?? ''}
            onChange={e => handleChange(itemName, e.target.value)}
            placeholder="–"
            className="w-16 text-center rounded-lg border border-gray-200 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            aria-label={`Gång för ${itemName}`}
          />
        </div>
      ))}
    </div>
  )
}
