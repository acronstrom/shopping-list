import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useRecipes, useRecipeImageUrl } from '@/hooks/useRecipes'
import type { RecipeWithIngredients } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (recipe: RecipeWithIngredients) => void
  title?: string
  excludeRecipeId?: string | null
}

export function RecipePickerModal({ open, onClose, onSelect, title = 'Välj recept', excludeRecipeId }: Props) {
  const { data: recipes = [], isLoading } = useRecipes()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('sv')
    return recipes
      .filter(r => r.id !== excludeRecipeId)
      .filter(r => {
        if (!q) return true
        if (r.name.toLocaleLowerCase('sv').includes(q)) return true
        if ((r.category ?? '').toLocaleLowerCase('sv').includes(q)) return true
        if ((r.tags ?? []).some(t => t.toLocaleLowerCase('sv').includes(q))) return true
        return false
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'sv'))
  }, [recipes, query, excludeRecipeId])

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        <input
          type="search"
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Sök recept, kategori eller tagg"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner className="h-5 w-5" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            {query.trim() ? 'Inga recept matchar din sökning.' : 'Inga recept att välja mellan än.'}
          </p>
        ) : (
          <ul className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
            {filtered.map(recipe => (
              <li key={recipe.id}>
                <RecipePickerRow
                  recipe={recipe}
                  onSelect={() => {
                    onSelect(recipe)
                    onClose()
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}

function RecipePickerRow({
  recipe,
  onSelect,
}: {
  recipe: RecipeWithIngredients
  onSelect: () => void
}) {
  const { data: imageUrl } = useRecipeImageUrl(recipe.image_path)
  const totalMinutes = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0)

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
    >
      {imageUrl ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-base" aria-hidden>📖</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{recipe.name}</p>
        <div className="flex flex-wrap gap-x-2 text-xs text-gray-400 mt-0.5">
          {recipe.category && <span>{recipe.category}</span>}
          {totalMinutes > 0 && (
            <>
              {recipe.category && <span>·</span>}
              <span>⏱ {totalMinutes} min</span>
            </>
          )}
        </div>
      </div>
      {recipe.is_favorite && <span aria-hidden className="text-rose-500 text-sm">♥</span>}
    </button>
  )
}
