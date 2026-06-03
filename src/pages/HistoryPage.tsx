import { useState } from 'react'
import {
  useClearPurchaseHistory,
  useDeletePurchaseHistoryItem,
  usePurchaseHistory,
} from '@/hooks/usePurchaseHistory'
import { PageHeader } from '@/components/layout/PageHeader'
import { Group, GroupHeader } from '@/components/ui/Group'
import { Dot } from '@/components/ui/Dot'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Trash } from '@/lib/icons'
import { capitalizeFirst } from '@/lib/text'

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
      <PageHeader eyebrow="Mer" title="Inköpshistorik" />
      <div className="px-[18px] pt-2 flex flex-col gap-[18px]">
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
            <div className="flex items-center justify-between gap-2 px-1">
              <p className="text-[13px] text-ink-3">{history.length} inköp sparade</p>
              {confirmClear ? (
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-ink-3">Rensa allt?</span>
                  <Button type="button" variant="danger" size="sm" onClick={handleClear} loading={clearHistory.isPending}>
                    Ja, rensa
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                    Avbryt
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="text-[13px] font-medium text-rose hover:opacity-80"
                >
                  Rensa historik
                </button>
              )}
            </div>

            {Object.entries(grouped).map(([label, items]) => (
              <div key={label} className="flex flex-col">
                <GroupHeader>{label}</GroupHeader>
                <Group divider>
                  {items.map(row => (
                    <div key={row.id} className="group flex items-center gap-3 px-4 py-3.5">
                      {row.category ? <Dot category={row.category} /> : <Dot className="bg-c-other" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-[15.5px] text-ink truncate">{capitalizeFirst(row.item_name)}</p>
                      </div>
                      <span className="text-[13px] text-ink-3 tabular-nums flex-none">{formatDate(row.purchased_at)}</span>
                      <button
                        type="button"
                        onClick={() => deleteItem.mutate(row.id)}
                        disabled={deleteItem.isPending}
                        className="flex-none p-1.5 text-ink-4 hover:text-rose md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all rounded-lg hover:bg-rose-tint disabled:opacity-40"
                        aria-label={`Ta bort ${row.item_name} från historiken`}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  ))}
                </Group>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
