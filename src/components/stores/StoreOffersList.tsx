import { useMemo, useState } from 'react'
import { useStoreOffers, useRefreshOffers } from '@/hooks/useStoreOffers'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { clsx } from 'clsx'
import type { StoreOffer } from '@/types'

interface Props {
  storeId: string
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

export function StoreOffersList({ storeId, hasUrl, scrapedAt }: Props) {
  const { data: offers = [], isLoading } = useStoreOffers(storeId)
  const refresh = useRefreshOffers()
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [query, setQuery] = useState('')

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
                        {items.map(offer => <OfferRow key={offer.id} offer={offer} />)}
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

function OfferRow({ offer }: { offer: StoreOffer }) {
  const validToLabel = formatValidTo(offer.valid_to)
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{offer.name}</p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
            {offer.brand && <span>{offer.brand}</span>}
            {offer.unit && <span>{offer.unit}</span>}
            {offer.comparison_price && <span>Jmf {offer.comparison_price}</span>}
            {validToLabel && <span className="text-amber-600">t.o.m. {validToLabel}</span>}
          </div>
          {offer.valid_period && (
            <p className="text-xs text-gray-400 mt-0.5 italic">{offer.valid_period}</p>
          )}
        </div>
        {offer.price && (
          <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap flex-shrink-0">
            {offer.price}
          </span>
        )}
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
