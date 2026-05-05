import { useGroceries, useAddGrocery } from '@/hooks/useGroceries'
import { useSuggestions } from '@/hooks/usePurchaseHistory'

export function SuggestionBar() {
  const { data: items = [] } = useGroceries()
  const { data: suggestions = [] } = useSuggestions(items.map(i => i.name))
  const addGrocery = useAddGrocery()

  if (suggestions.length === 0) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3">
      <p className="text-xs font-medium text-gray-400 mb-2">Förslag för dig</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {suggestions.map(s => (
          <button
            key={s.item_name}
            onClick={() => addGrocery.mutate({ name: s.item_name })}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-full text-xs font-medium transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {s.item_name}
          </button>
        ))}
      </div>
    </div>
  )
}
