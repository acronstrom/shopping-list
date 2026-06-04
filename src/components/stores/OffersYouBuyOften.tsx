import { useMemo } from 'react'
import { useOfferMatches } from '@/hooks/useOfferMatches'
import { useGroceries } from '@/hooks/useGroceries'
import { OfferRow } from '@/components/stores/OfferRow'
import { Spark } from '@/lib/icons'
import { clsx } from 'clsx'

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export function OffersYouBuyOften() {
  const { data: matches = [], isLoading } = useOfferMatches()
  const { data: groceries = [] } = useGroceries()

  const existingIdsByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const g of groceries) {
      const key = normalizeName(g.name)
      if (!map.has(key)) map.set(key, g.id)
    }
    return map
  }, [groceries])

  // Group offers into a section per store. Within each store, most-bought
  // first, and drop duplicates of the same product (the scraper can list an
  // item more than once). Sorting before dedupe keeps the best-scoring row.
  const groups = useMemo(() => {
    const ordered = [...matches].sort(
      (a, b) =>
        a.storeName.localeCompare(b.storeName, 'sv') ||
        b.count - a.count ||
        b.score - a.score,
    )
    const seen = new Set<string>()
    const byStore = new Map<string, typeof matches>()
    for (const m of ordered) {
      const key = `${m.store_id}|${normalizeName(m.name)}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!byStore.has(m.storeName)) byStore.set(m.storeName, [])
      byStore.get(m.storeName)!.push(m)
    }
    return Array.from(byStore, ([storeName, items]) => ({ storeName, items }))
  }, [matches])

  const total = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups])

  if (isLoading || total === 0) return null

  return (
    <div className="bg-surface rounded-[14px] border border-clay-line overflow-hidden shadow-card">
      <div className="px-3 py-2 bg-clay-tint border-b border-clay-line flex items-center justify-between">
        <p className="text-xs font-semibold text-clay-deep flex items-center gap-1.5">
          <Spark size={14} />
          Erbjudanden du brukar köpa
        </p>
        <span className="text-xs text-clay-deep/80">{total}</span>
      </div>
      {groups.map((group, idx) => (
        <div key={group.storeName} className={clsx(idx > 0 && 'border-t border-hair')}>
          <div className="px-3 py-2 bg-surface-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-ink truncate">{group.storeName}</span>
            <span className="text-xs text-ink-4">{group.items.length}</span>
          </div>
          <ul className="divide-y divide-hair-2 border-t border-hair">
            {group.items.map(m => (
              <OfferRow
                key={m.id}
                offer={m}
                storeName={m.storeName}
                existingGroceryId={existingIdsByName.get(normalizeName(m.name)) ?? null}
                frequencyBadge={`Köpt ${m.count}×`}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
