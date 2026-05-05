import { usePurchaseHistory } from '@/hooks/usePurchaseHistory'
import { Header } from '@/components/layout/Header'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('default', {
    weekday: 'short', month: 'short', day: 'numeric'
  }).format(new Date(dateStr))
}

function weekLabel(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) return 'This week'
  if (diffDays < 14) return 'Last week'
  return new Intl.DateTimeFormat('default', { month: 'long', year: 'numeric' }).format(date)
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
      <Header title="Purchase History" />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
        ) : history.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No history yet"
            description="When you clear checked items from your list, they'll appear here. We'll use this to suggest items you buy regularly."
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
