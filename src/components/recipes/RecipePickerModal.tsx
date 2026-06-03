import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Book, Clock, HeartFill } from '@/lib/icons'
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
          className="rounded-[14px] border border-hair bg-surface px-3 py-2.5 text-[16px] text-ink placeholder:text-ink-4 focus:outline-none focus:ring-2 focus:ring-clay/30 focus:border-clay-line"
        />

        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner className="h-5 w-5" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-ink-3 text-center py-8">
            {query.trim() ? 'Inga recept matchar din sökning.' : 'Inga recept att välja mellan än.'}
          </p>
        ) : (
          <ul className="bg-surface rounded-group border border-hair overflow-hidden divide-y divide-hair-2 max-h-[60vh] overflow-y-auto">
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
      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-surface-2 transition-colors"
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-10 h-10 rounded-[10px] object-cover flex-none bg-surface-2" />
      ) : (
        <div className="w-10 h-10 bg-surface-2 border border-hair rounded-[10px] grid place-items-center text-ink-3 flex-none">
          <Book size={18} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] text-ink truncate">{recipe.name}</p>
        <div className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-3 mt-0.5">
          {recipe.category && <span>{recipe.category}</span>}
          {totalMinutes > 0 && (
            <>
              {recipe.category && <span className="text-ink-4">·</span>}
              <span className="flex items-center gap-1"><Clock size={13} /> {totalMinutes} min</span>
            </>
          )}
        </div>
      </div>
      {recipe.is_favorite && <span className="text-clay flex-none" aria-label="Favorit"><HeartFill size={14} /></span>}
    </button>
  )
}
