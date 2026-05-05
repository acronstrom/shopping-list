import { usePurchaseHistory } from '@/hooks/usePurchaseHistory'
import { Header } from '@/components/layout/Header'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'

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

  const grouped = history.reduce<Record<string, typeof history>>((acc, row) => {
    const label = weekLabel(row.purchased_at)
    if (!acc[label]) acc[label] = []
    acc[label].push(row)
    return acc
  }, {})

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
          Object.entries(grouped).map(([label, items]) => (
            <div key={label}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {label}
              </h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {items.map(row => (
                  <div key={row.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{row.item_name}</p>
                      <p className="text-xs text-gray-400">{formatDate(row.purchased_at)}</p>
                    </div>
                    {row.category && <CategoryBadge category={row.category} />}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
