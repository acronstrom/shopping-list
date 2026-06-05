import { useMemo, useState } from 'react'
import { useStoreOffers, useRefreshOffers } from '@/hooks/useStoreOffers'
import { useGroceries } from '@/hooks/useGroceries'
import { useFrequentlyBoughtNames, type FrequentItem } from '@/hooks/usePurchaseHistory'
import { useOfferFeedback, useDismissOfferMatch } from '@/hooks/useOfferFeedback'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Spark, ChevronDown } from '@/lib/icons'
import { clsx } from 'clsx'
import { OfferRow } from '@/components/stores/OfferRow'
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

function formatScrapedAt(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StoreOffersList({ storeId, storeName, hasUrl, scrapedAt }: Props) {
  const { data: offers = [], isLoading } = useStoreOffers(storeId)
  const { data: groceries = [] } = useGroceries()
  const { data: frequents = [] } = useFrequentlyBoughtNames()
  const { data: feedback = [] } = useOfferFeedback()
  const dismissMatch = useDismissOfferMatch()
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

  // Pairings the household marked as "inte relevant". Keyed
  // frequentLower|normalizedOfferName so a dismissed offer stays hidden when
  // it re-scrapes under the same name.
  const dismissedPairs = useMemo(() => {
    const set = new Set<string>()
    for (const f of feedback) set.add(`${f.frequent_name}|${normalizeName(f.offer_name)}`)
    return set
  }, [feedback])

  const frequentMatches = useMemo(() => {
    if (frequents.length === 0 || offers.length === 0) return []
    const matched = offers
      .map(offer => ({ offer, match: matchFrequentBuy(offer, frequents) }))
      .filter((row): row is { offer: StoreOffer; match: FrequentItem } => row.match !== null)
      .filter(({ offer, match }) => !dismissedPairs.has(`${match.name}|${normalizeName(offer.name)}`))
    matched.sort((a, b) => b.match.count - a.match.count)
    return matched.slice(0, 12)
  }, [offers, frequents, dismissedPairs])

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
      <p className="text-xs text-ink-4">
        Lägg till en länk ovan för att kunna hämta erbjudanden hit.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-ink-4 min-w-0 truncate">
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
        <p className="text-xs text-rose bg-rose-tint rounded-[12px] px-2.5 py-1.5">{error}</p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner className="h-5 w-5" /></div>
      ) : offers.length === 0 ? (
        <p className="text-xs text-ink-4 py-2">
          {scrapedAt
            ? 'Inga erbjudanden hittades på sidan.'
            : 'Tryck "Hämta" för att läsa in aktuella erbjudanden.'}
        </p>
      ) : (
        <>
          {frequentMatches.length > 0 && !query && (
            <div className="bg-surface rounded-[14px] border border-clay-line overflow-hidden shadow-card">
              <div className="px-3 py-2 bg-clay-tint border-b border-clay-line flex items-center justify-between">
                <p className="text-xs font-semibold text-clay-deep flex items-center gap-1.5">
                  <Spark size={14} />
                  Du köper ofta
                </p>
                <span className="text-xs text-clay-deep/80">{frequentMatches.length}</span>
              </div>
              <ul className="divide-y divide-hair-2">
                {frequentMatches.map(({ offer, match }) => (
                  <OfferRow
                    key={`fav-${offer.id}`}
                    offer={offer}
                    storeName={storeName}
                    existingGroceryId={existingIdsByName.get(normalizeName(offer.name)) ?? null}
                    frequencyBadge={`Köpt ${match.count}×`}
                    matchedName={match.name}
                    onDismiss={() => dismissMatch.mutate({ frequent_name: match.name, offer_name: offer.name })}
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
            className="w-full rounded-[14px] border border-hair bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-clay/30 focus:border-clay-line"
          />

          {grouped.length === 0 ? (
            <p className="text-xs text-ink-4 py-2 text-center">
              Inga träffar.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {grouped.map(({ category, items }) => {
                const isOpen = expanded[category] ?? !!query
                return (
                  <div
                    key={category}
                    className="bg-surface rounded-[14px] border border-hair overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(category)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-surface-2 transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-ink truncate">
                          {category}
                        </span>
                        <span className="text-xs text-ink-4">{items.length}</span>
                      </span>
                      <ChevronDown size={16} className={clsx('text-ink-4 transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
                    </button>
                    {isOpen && (
                      <ul className="divide-y divide-hair-2 border-t border-hair">
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
