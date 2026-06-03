import { useGroceries, useAddGrocery } from '@/hooks/useGroceries'
import { useSuggestions } from '@/hooks/usePurchaseHistory'
import { capitalizeFirst } from '@/lib/text'
import { Plus, Spark } from '@/lib/icons'

export function SuggestionBar() {
  const { data: items = [] } = useGroceries()
  const { data: suggestions = [] } = useSuggestions(items.map(i => i.name))
  const addGrocery = useAddGrocery()

  if (suggestions.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
        <Spark size={14} />
        Förslag för dig
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-[18px] px-[18px] pb-0.5">
        {suggestions.map(s => (
          <button
            key={s.item_name}
            onClick={() => addGrocery.mutate({ name: s.item_name })}
            className="flex-none inline-flex items-center gap-1.5 px-[13px] py-[7px] rounded-full text-[13px] font-medium bg-clay-tint text-clay-deep border border-clay-line whitespace-nowrap transition-all active:scale-95"
          >
            <Plus size={13} />
            {capitalizeFirst(s.item_name)}
          </button>
        ))}
      </div>
    </div>
  )
}
