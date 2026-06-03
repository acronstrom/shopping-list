import { useState } from 'react'
import { useDeleteStore, useUpdateStore } from '@/hooks/useStores'
import { StoreCategoryOrderEditor } from './StoreCategoryOrderEditor'
import { StoreOffersList } from './StoreOffersList'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Store, Tag, Trash, ChevronDown, ArrowRight } from '@/lib/icons'
import { clsx } from 'clsx'
import type { Store as StoreType } from '@/types'

interface Props {
  store: StoreType
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function openOffers(url: string | null) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function StoreCard({ store }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [orderExpanded, setOrderExpanded] = useState(false)
  const [urlInput, setUrlInput] = useState(store.offers_url ?? '')
  const [urlError, setUrlError] = useState('')
  const [seededUrl, setSeededUrl] = useState<string | null>(store.offers_url)
  const deleteStore = useDeleteStore()
  const updateStore = useUpdateStore()

  if (store.offers_url !== seededUrl) {
    setSeededUrl(store.offers_url)
    setUrlInput(store.offers_url ?? '')
    setUrlError('')
  }

  const hasUrl = !!store.offers_url
  const inputChanged = (store.offers_url ?? '') !== urlInput.trim()

  async function handleSaveUrl() {
    setUrlError('')
    const normalized = normalizeUrl(urlInput)
    if (normalized) {
      try {
        new URL(normalized)
      } catch {
        setUrlError('Ogiltig URL')
        return
      }
    }
    try {
      await updateStore.mutateAsync({ id: store.id, offers_url: normalized || null })
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : 'Det gick inte att spara länken')
    }
  }

  return (
    <div className="bg-surface rounded-[18px] shadow-card border border-hair overflow-hidden">
      <div className="flex items-center gap-2 p-3.5">
        <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <span
            className={clsx(
              'w-10 h-10 rounded-[12px] grid place-items-center flex-none transition-colors',
              expanded ? 'bg-clay-tint text-clay-deep' : 'bg-surface-2 border border-hair text-ink-2'
            )}
          >
            <Store size={21} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium text-ink truncate">{store.name}</span>
            <span className="block text-[13px] text-ink-3">Tryck för att {expanded ? 'dölja' : 'redigera'}</span>
          </span>
          <ChevronDown size={18} className={clsx('text-ink-4 flex-none transition-transform', expanded && 'rotate-180')} />
        </button>
        {hasUrl && !expanded && (
          <button
            onClick={e => { e.stopPropagation(); openOffers(store.offers_url) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-clay-deep bg-clay-tint border border-clay-line rounded-full transition-colors whitespace-nowrap flex-none"
            aria-label="Öppna erbjudanden"
          >
            <Tag size={13} />
            <span className="hidden sm:inline">Erbjudanden</span>
          </button>
        )}
        <button
          onClick={() => deleteStore.mutate(store.id)}
          disabled={deleteStore.isPending}
          className="p-2 text-ink-4 hover:text-rose hover:bg-rose-tint rounded-lg transition-colors disabled:opacity-50 flex-none"
          aria-label="Ta bort butik"
        >
          <Trash size={16} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-hair px-4 pb-4 pt-4 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-[12px] font-semibold text-ink-3 uppercase tracking-[0.06em]">Erbjudanden</p>
            <p className="text-[13px] text-ink-3">
              Länka till kedjans sida med aktuella erbjudanden. Den öppnas i din webbläsare.
            </p>
            <div className="flex gap-2 items-end">
              <div className="flex-1 min-w-0">
                <Input
                  type="url"
                  inputMode="url"
                  placeholder="https://www.ica.se/erbjudanden/…"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                />
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={handleSaveUrl} loading={updateStore.isPending} disabled={!inputChanged}>
                Spara
              </Button>
            </div>
            {urlError && <p className="text-[13px] text-rose bg-rose-tint rounded-[12px] px-2.5 py-1.5">{urlError}</p>}
            {hasUrl && (
              <button
                type="button"
                onClick={() => openOffers(store.offers_url)}
                className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-clay-deep hover:opacity-80"
              >
                <Tag size={15} />
                Öppna i webbläsaren
                <ArrowRight size={15} />
              </button>
            )}
            <div className="mt-2 pt-3 border-t border-hair-2">
              <StoreOffersList
                storeId={store.id}
                storeName={store.name}
                hasUrl={hasUrl}
                scrapedAt={store.offers_scraped_at}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setOrderExpanded(o => !o)}
              className="flex items-center justify-between gap-2 -mx-1 px-1 py-1 rounded-lg hover:bg-surface-2 transition-colors"
            >
              <span className="text-[12px] font-semibold text-ink-3 uppercase tracking-[0.06em]">Kategoriordning</span>
              <ChevronDown size={17} className={clsx('text-ink-4 transition-transform', orderExpanded && 'rotate-180')} />
            </button>
            {orderExpanded && (
              <>
                <p className="text-[13px] text-ink-3">
                  Välj i vilken ordning kategorierna ska visas/sorteras i den här butiken.
                </p>
                <StoreCategoryOrderEditor storeId={store.id} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
