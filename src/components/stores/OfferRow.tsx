import { useState } from 'react'
import { useAddGrocery, useDeleteGrocery } from '@/hooks/useGroceries'
import { Check, Plus, X } from '@/lib/icons'
import { clsx } from 'clsx'

// The offer fields a row renders. Both StoreOffer and MatchedOffer satisfy
// this structurally, so the same row serves the per-store list and the
// cross-store "you buy this often" section.
export interface OfferDisplay {
  id: string
  name: string
  brand: string | null
  price: string | null
  unit: string | null
  comparison_price: string | null
  valid_period: string | null
  valid_to: string | null
}

function formatValidTo(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })
}

export function OfferRow({
  offer,
  storeName,
  existingGroceryId,
  frequencyBadge,
  matchedName,
  onDismiss,
}: {
  offer: OfferDisplay
  storeName: string
  existingGroceryId: string | null
  frequencyBadge?: string
  // When this row is a suggestion (matched to something bought often),
  // `matchedName` is the frequent item that produced it and `onDismiss`
  // lets the user mark the pairing as irrelevant.
  matchedName?: string
  onDismiss?: () => void
}) {
  const addGrocery = useAddGrocery()
  const deleteGrocery = useDeleteGrocery()
  const [confirmDismiss, setConfirmDismiss] = useState(false)
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

  const canDismiss = !!matchedName && !!onDismiss

  function handleConfirmDismiss(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirmDismiss(false)
    onDismiss?.()
  }

  return (
    <li
      className={clsx(
        'px-3 py-2.5 flex items-start justify-between gap-3',
        alreadyInList && 'bg-clay-tint/50'
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={clsx('text-sm font-medium truncate', alreadyInList ? 'text-ink-3' : 'text-ink')}>
          {offer.name}
        </p>
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-ink-3 mt-0.5">
          {frequencyBadge && (
            <span className="text-clay-deep font-medium">{frequencyBadge}</span>
          )}
          {offer.brand && <span>{offer.brand}</span>}
          {offer.unit && <span>{offer.unit}</span>}
          {offer.comparison_price && <span>Jmf {offer.comparison_price}</span>}
          {validToLabel && <span className="text-clay-deep">t.o.m. {validToLabel}</span>}
        </div>
        {offer.valid_period && (
          <p className="text-xs text-ink-4 mt-0.5 italic">{offer.valid_period}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {offer.price && (
          <span className={clsx('text-sm font-semibold whitespace-nowrap', alreadyInList ? 'text-ink-4' : 'text-clay-deep')}>
            {offer.price}
          </span>
        )}
        {canDismiss && confirmDismiss ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink-3 whitespace-nowrap">Dölj?</span>
            <button
              type="button"
              onClick={handleConfirmDismiss}
              aria-label={`Dölj förslaget ${offer.name}`}
              className="px-2.5 py-1.5 text-xs font-medium rounded-full bg-rose-tint text-rose hover:opacity-90 active:opacity-80 transition-all whitespace-nowrap"
            >
              Ja, dölj
            </button>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setConfirmDismiss(false) }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-full text-ink-2 hover:bg-surface-2 transition-all whitespace-nowrap"
            >
              Avbryt
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {canDismiss && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setConfirmDismiss(true) }}
                aria-label={`Dölj förslaget ${offer.name}`}
                title="Inte relevant"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full text-ink-4 hover:bg-rose-tint hover:text-rose transition-all active:scale-95"
              >
                <X size={15} sw={2} />
              </button>
            )}
            <button
              type="button"
              onClick={alreadyInList ? handleRemove : handleAdd}
              disabled={pending}
              aria-label={alreadyInList ? `Ta bort ${offer.name} från listan` : `Lägg till ${offer.name} i listan`}
              className={clsx(
                'inline-flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95 disabled:opacity-50',
                alreadyInList
                  ? 'bg-clay text-white hover:bg-clay-deep'
                  : 'bg-surface-2 text-ink-3 hover:bg-clay-tint hover:text-clay-deep'
              )}
            >
              {alreadyInList ? <Check size={16} /> : <Plus size={16} sw={2.5} />}
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
