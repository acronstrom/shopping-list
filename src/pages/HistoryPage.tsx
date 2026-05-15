import { useState } from 'react'
import {
  useClearPurchaseHistory,
  useDeletePurchaseHistoryItem,
  usePurchaseHistory,
} from '@/hooks/usePurchaseHistory'
import { Header } from '@/components/layout/Header'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('sv-SE', {
    weekday: 'short', month: 'short', day: 'numeric'
  }).format(new Date(dateStr))
}

function weekLabel(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) return 'Den här veckan'
  if (diffDays < 14) return 'Förra veckan'
  return new Intl.DateTimeFormat('sv-SE', { month: 'long', year: 'numeric' }).format(date)
}

export function HistoryPage() {
  const { data: history = [], isLoading } = usePurchaseHistory()
  const clearHistory = useClearPurchaseHistory()
  const deleteItem = useDeletePurchaseHistoryItem()
  const [confirmClear, setConfirmClear] = useState(false)

  const grouped = history.reduce<Record<string, typeof history>>((acc, row) => {
    const label = weekLabel(row.purchased_at)
    if (!acc[label]) acc[label] = []
    acc[label].push(row)
    return acc
  }, {})

  async function handleClear() {
    setConfirmClear(false)
    try {
      await clearHistory.mutateAsync()
    } catch (err) {
      console.error('[HistoryPage] clear failed', err)
    }
  }

  return (
    <div>
      <Header title="Inköpshistorik" />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
        ) : history.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Ingen historik än"
            description="När du rensar markerade varor från din lista visas de här. Vi använder detta för att föreslå varor du köper regelbundet."
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-400">
                {history.length} {history.length === 1 ? 'inköp' : 'inköp'} sparade
              </p>
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Rensa allt?</span>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleClear}
                    loading={clearHistory.isPending}
                  >
                    Ja, rensa
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmClear(false)}
                  >
                    Avbryt
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmClear(true)}
                >
                  Rensa historik
                </Button>
              )}
            </div>

            {Object.entries(grouped).map(([label, items]) => (
              <div key={label}>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                  {label}
                </h2>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                  {items.map(row => (
                    <div key={row.id} className="group flex items-center justify-between px-4 py-3 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 capitalize truncate">{row.item_name}</p>
                        <p className="text-xs text-gray-400">{formatDate(row.purchased_at)}</p>
                      </div>
                      {row.category && <CategoryBadge category={row.category} />}
                      <button
                        type="button"
                        onClick={() => deleteItem.mutate(row.id)}
                        disabled={deleteItem.isPending}
                        className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all rounded-lg hover:bg-red-50 disabled:opacity-40"
                        aria-label={`Ta bort ${row.item_name} från historiken`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
