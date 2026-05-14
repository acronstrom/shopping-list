import { useState } from 'react'
import { useDeleteStore, useUpdateStore } from '@/hooks/useStores'
import { StoreCategoryOrderEditor } from './StoreCategoryOrderEditor'
import { StoreOffersList } from './StoreOffersList'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Store } from '@/types'

interface Props {
  store: Store
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg">🏪</span>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate">{store.name}</p>
            <p className="text-xs text-gray-400">Tryck för att {expanded ? 'dölja' : 'redigera'}</p>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {hasUrl && (
          <button
            onClick={e => {
              e.stopPropagation()
              openOffers(store.offers_url)
            }}
            className="ml-2 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors whitespace-nowrap"
            aria-label="Öppna erbjudanden"
          >
            <span aria-hidden>🏷️</span>
            <span className="hidden sm:inline">Erbjudanden</span>
          </button>
        )}
        <button
          onClick={() => deleteStore.mutate(store.id)}
          disabled={deleteStore.isPending}
          className="ml-2 p-2 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Ta bort butik"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Erbjudanden</p>
            <p className="text-xs text-gray-400">
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
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleSaveUrl}
                loading={updateStore.isPending}
                disabled={!inputChanged}
              >
                Spara
              </Button>
            </div>
            {urlError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5">{urlError}</p>
            )}
            {hasUrl && (
              <button
                type="button"
                onClick={() => openOffers(store.offers_url)}
                className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                <span aria-hidden>🏷️</span>
                Öppna i webbläsaren
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}
            <div className="mt-2 pt-3 border-t border-gray-100">
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
              className="flex items-center justify-between gap-2 -mx-1 px-1 py-1 rounded-lg hover:bg-gray-50/80 transition-colors"
            >
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kategoriordning</span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${orderExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {orderExpanded && (
              <>
                <p className="text-xs text-gray-400">
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
