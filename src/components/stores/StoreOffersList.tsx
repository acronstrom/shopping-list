import { useMemo, useState } from 'react'
import { useStoreOffers, useRefreshOffers } from '@/hooks/useStoreOffers'
import { useAddGrocery, useDeleteGrocery, useGroceries } from '@/hooks/useGroceries'
import { useFrequentlyBoughtNames, type FrequentItem } from '@/hooks/usePurchaseHistory'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { clsx } from 'clsx'
import type { StoreOffer } from '@/types'

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

// Treat an offer as a "frequently bought" match if its name overlaps with
// a historical purchase name as a substring in either direction. We
// require both strings to have ≥3 characters to avoid noise (e.g. "Os"
// matching "Postlådor"). Returns the highest-count match found.
function matchFrequentBuy(offer: StoreOffer, frequents: FrequentItem[]): FrequentItem | null {
  const offerName = normalizeName(offer.name)
  if (offerName.length < 3) return null
  let best: FrequentItem | null = null
  for (const f of frequents) {
    if (f.name.length < 3) continue
    if (offerName.includes(f.name) || f.name.includes(offerName)) {
      if (!best || f.count > best.count) best = f
    }
  }
  return best
}

interface Props {
  storeId: string
  storeName: string
  hasUrl: boolean
  scrapedAt: string | null
}

const CATEGORY_EMOJI: Record<string, string> = {
  'Frukt & Grönt': '🥬',
  'Färskvaror': '🥩',
  'Mejeri': '🥛',
  'Bröd, kex & bageri': '🥖',
  'Djupfryst': '🧊',
  'Skafferivaror': '🥫',
  'Dryck': '🥤',
  'Hälsa & skönhet': '💄',
  'Hem & fritid': '🏡',
  'Djur': '🐾',
  'Barn': '🍼',
}

function formatScrapedAt(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatValidTo(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })
}

export function StoreOffersList({ storeId, storeName, hasUrl, scrapedAt }: Props) {
  const { data: offers = [], isLoading } = useStoreOffers(storeId)
  const { data: groceries = [] } = useGroceries()
  const { data: frequents = [] } = useFrequentlyBoughtNames()
  const refresh = useRefreshOffers()
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')

  const existingIdsByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const g of groceries) {
      const key = normalizeName(g.name)
      if (!map.has(key)) map.set(key, g.id)
    }
    return map
  }, [groceries])

  const frequentMatches = useMemo(() => {
    if (frequents.length === 0 || offers.length === 0) return []
    const matched = offers
      .map(offer => ({ offer, match: matchFrequentBuy(offer, frequents) }))
      .filter((row): row is { offer: StoreOffer; match: FrequentItem } => row.match !== null)
    matched.sort((a, b) => b.match.count - a.match.count)
    return matched.slice(0, 12)
  }, [offers, frequents])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return offers
    return offers.filter(o =>
      o.name.toLowerCase().includes(q) ||
      (o.brand?.toLowerCase().includes(q) ?? false)
    )
  }, [offers, query])

  const grouped = useMemo(() => groupByCategory(filtered), [filtered])

  async function handleRefresh() {
    setError('')
    try {
      await refresh.mutateAsync(storeId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att hämta erbjudanden')
    }
  }

  function toggle(category: string) {
    setExpanded(prev => ({ ...prev, [category]: !prev[category] }))
  }

  if (!hasUrl) {
    return (
      <p className="text-xs text-gray-400">
        Lägg till en länk ovan för att kunna hämta erbjudanden hit.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-gray-400 min-w-0 truncate">
          {refresh.isPending
            ? 'Hämtar erbjudanden…'
            : scrapedAt
              ? `${offers.length} erbjudanden · uppdaterad ${formatScrapedAt(scrapedAt)}`
              : 'Inte hämtade än'}
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={handleRefresh}
          loading={refresh.isPending}
        >
          {scrapedAt ? 'Uppdatera' : 'Hämta'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5">{error}</p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner className="h-5 w-5" /></div>
      ) : offers.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">
          {scrapedAt
            ? 'Inga erbjudanden hittades på sidan.'
            : 'Tryck "Hämta" för att läsa in aktuella erbjudanden.'}
        </p>
      ) : (
        <>
          {frequentMatches.length > 0 && !query && (
            <div className="bg-white rounded-xl border border-emerald-200/80 overflow-hidden shadow-sm">
              <div className="px-3 py-2 bg-emerald-50/60 border-b border-emerald-100/80 flex items-center justify-between">
                <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <span aria-hidden>⭐</span>
                  Du köper ofta
                </p>
                <span className="text-xs text-emerald-600/80">{frequentMatches.length}</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {frequentMatches.map(({ offer, match }) => (
                  <OfferRow
                    key={`fav-${offer.id}`}
                    offer={offer}
                    storeName={storeName}
                    existingGroceryId={existingIdsByName.get(normalizeName(offer.name)) ?? null}
                    frequencyBadge={`Köpt ${match.count}×`}
                  />
                ))}
              </ul>
            </div>
          )}

          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Sök bland erbjudandena…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
          />

          {grouped.length === 0 ? (
            <p className="text-xs text-gray-400 py-2 text-center">
              Inga träffar.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {grouped.map(({ category, items }) => {
                const isOpen = expanded[category] ?? !!query
                const emoji = CATEGORY_EMOJI[category] ?? '🛒'
                return (
                  <div
                    key={category}
                    className="bg-white rounded-xl border border-gray-200/80 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(category)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-50/80 transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span aria-hidden className="text-base">{emoji}</span>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {category}
                        </span>
                        <span className="text-xs text-gray-400">{items.length}</span>
                      </span>
                      <svg
                        className={clsx('w-4 h-4 text-gray-400 transition-transform flex-shrink-0', isOpen && 'rotate-180')}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <ul className="divide-y divide-gray-100 border-t border-gray-100">
                        {items.map(offer => (
                          <OfferRow
                            key={offer.id}
                            offer={offer}
                            storeName={storeName}
                            existingGroceryId={existingIdsByName.get(normalizeName(offer.name)) ?? null}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function OfferRow({
  offer,
  storeName,
  existingGroceryId,
  frequencyBadge,
}: {
  offer: StoreOffer
  storeName: string
  existingGroceryId: string | null
  frequencyBadge?: string
}) {
  const addGrocery = useAddGrocery()
  const deleteGrocery = useDeleteGrocery()
  const validToLabel = formatValidTo(offer.valid_to)
  const alreadyInList = existingGroceryId !== null
  const pending = addGrocery.isPending || deleteGrocery.isPending

  async function handleAdd(e: React.MouseEvent) {
    e.stopPropagation()
    if (pending) return
    try {
      const priceTag = offer.price ? ` · ${offer.price}` : ''
      await addGrocery.mutateAsync({
        name: offer.name,
        quantity: offer.unit ?? undefined,
        note: `Erbjudande på ${storeName}${priceTag}`,
      })
    } catch (err) {
      console.error('[OfferRow] add failed', err)
    }
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    if (pending || !existingGroceryId) return
    try {
      await deleteGrocery.mutateAsync(existingGroceryId)
    } catch (err) {
      console.error('[OfferRow] remove failed', err)
    }
  }

  return (
    <li
      className={clsx(
        'px-3 py-2.5 flex items-start justify-between gap-3',
        alreadyInList && 'bg-emerald-50/40'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={clsx('text-sm font-medium truncate', alreadyInList ? 'text-gray-500' : 'text-gray-900')}>
          {offer.name}
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
          {frequencyBadge && (
            <span className="text-emerald-700 font-medium">{frequencyBadge}</span>
          )}
          {offer.brand && <span>{offer.brand}</span>}
          {offer.unit && <span>{offer.unit}</span>}
          {offer.comparison_price && <span>Jmf {offer.comparison_price}</span>}
          {validToLabel && <span className="text-amber-600">t.o.m. {validToLabel}</span>}
        </div>
        {offer.valid_period && (
          <p className="text-xs text-gray-400 mt-0.5 italic">{offer.valid_period}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {offer.price && (
          <span className={clsx('text-sm font-semibold whitespace-nowrap', alreadyInList ? 'text-gray-400' : 'text-emerald-600')}>
            {offer.price}
          </span>
        )}
        <button
          type="button"
          onClick={alreadyInList ? handleRemove : handleAdd}
          disabled={pending}
          aria-label={alreadyInList ? `Ta bort ${offer.name} från listan` : `Lägg till ${offer.name} i listan`}
          className={clsx(
            'inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95 disabled:opacity-50',
            alreadyInList
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-600'
          )}
        >
          {alreadyInList ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          )}
        </button>
      </div>
    </li>
  )
}

function groupByCategory(offers: StoreOffer[]): Array<{ category: string; items: StoreOffer[] }> {
  const order: string[] = []
  const groups = new Map<string, StoreOffer[]>()
  for (const offer of offers) {
    const cat = offer.category?.trim() || 'Övrigt'
    if (!groups.has(cat)) {
      groups.set(cat, [])
      order.push(cat)
    }
    groups.get(cat)!.push(offer)
  }
  return order.map(category => ({ category, items: groups.get(category)! }))
}
