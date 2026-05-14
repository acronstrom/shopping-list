import { useState } from 'react'
import { useStoreOffers, useRefreshOffers } from '@/hooks/useStoreOffers'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'

interface Props {
  storeId: string
  hasUrl: boolean
  scrapedAt: string | null
}

function formatScrapedAt(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  return date.toLocaleString('sv-SE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function StoreOffersList({ storeId, hasUrl, scrapedAt }: Props) {
  const { data: offers = [], isLoading } = useStoreOffers(storeId)
  const refresh = useRefreshOffers()
  const [error, setError] = useState('')

  async function handleRefresh() {
    setError('')
    try {
      await refresh.mutateAsync(storeId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att hämta erbjudanden')
    }
  }

  if (!hasUrl) {
    return (
      <p className="text-xs text-gray-400">
        Lägg till en länk ovan för att kunna hämta erbjudanden hit.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-gray-400 min-w-0 truncate">
          {refresh.isPending
            ? 'Hämtar erbjudanden…'
            : scrapedAt
              ? `Uppdaterad ${formatScrapedAt(scrapedAt)}`
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
        <ul className="flex flex-col divide-y divide-gray-100 -mx-1">
          {offers.map(offer => (
            <li key={offer.id} className="px-1 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-gray-900 truncate">{offer.name}</p>
                {offer.price && (
                  <span className="text-sm font-semibold text-emerald-600 whitespace-nowrap">
                    {offer.price}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500">
                {offer.brand && <span>{offer.brand}</span>}
                {offer.unit && <span>{offer.unit}</span>}
                {offer.comparison_price && <span>{offer.comparison_price}</span>}
                {offer.valid_period && <span className="italic">{offer.valid_period}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
