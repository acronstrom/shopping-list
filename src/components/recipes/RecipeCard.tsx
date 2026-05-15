import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { useAddGroceriesBulk } from '@/hooks/useGroceries'
import { useDeleteRecipe } from '@/hooks/useRecipes'
import type { RecipeWithIngredients } from '@/types'

interface Props {
  recipe: RecipeWithIngredients
}

export function RecipeCard({ recipe }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(recipe.ingredients.map(i => i.id)))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addedAt, setAddedAt] = useState<number>(0)
  const addBulk = useAddGroceriesBulk()
  const deleteRecipe = useDeleteRecipe()

  const ingredientCount = recipe.ingredients.length

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === ingredientCount) setSelected(new Set())
    else setSelected(new Set(recipe.ingredients.map(i => i.id)))
  }

  async function handleAddSelected() {
    const items = recipe.ingredients
      .filter(i => selected.has(i.id))
      .map(i => ({
        name: i.name,
        quantity: i.quantity ?? undefined,
      }))
    if (items.length === 0) return
    try {
      await addBulk.mutateAsync(items)
      setAddedAt(Date.now())
      window.setTimeout(() => setAddedAt(0), 1800)
    } catch (err) {
      console.error('[RecipeCard] add failed', err)
    }
  }

  async function handleDelete() {
    try {
      await deleteRecipe.mutateAsync(recipe.id)
    } catch (err) {
      console.error('[RecipeCard] delete failed', err)
    }
  }

  const selectedCount = selected.size
  const justAdded = addedAt > 0

  const buttonLabel = useMemo(() => {
    if (justAdded) return `${selectedCount} tillagda`
    if (selectedCount === 0) return 'Inget valt'
    if (selectedCount === ingredientCount) return `Lägg till alla (${selectedCount})`
    return `Lägg till markerade (${selectedCount})`
  }, [selectedCount, ingredientCount, justAdded])

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50/80 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-lg" aria-hidden>📖</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{recipe.name}</p>
            <p className="text-xs text-gray-400">
              {ingredientCount === 0
                ? 'Inga ingredienser'
                : `${ingredientCount} ${ingredientCount === 1 ? 'ingrediens' : 'ingredienser'}`}
            </p>
          </div>
        </div>
        <svg
          className={clsx('w-4 h-4 text-gray-400 transition-transform flex-shrink-0', expanded && 'rotate-180')}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 flex flex-col gap-3">
          {ingredientCount === 0 ? (
            <p className="text-sm text-gray-400 py-2">Inga ingredienser i det här receptet än.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Bocka av sånt du redan har hemma — bara markerade läggs till.
                </p>
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  {selectedCount === ingredientCount ? 'Avmarkera alla' : 'Markera alla'}
                </button>
              </div>

              <ul className="rounded-xl border border-gray-200/70 bg-white divide-y divide-gray-100">
                {recipe.ingredients.map(ing => (
                  <li key={ing.id}>
                    <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50/80 transition-colors">
                      <input
                        type="checkbox"
                        checked={selected.has(ing.id)}
                        onChange={() => toggle(ing.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="flex-1 min-w-0 text-sm text-gray-900 truncate">
                        {ing.name}
                      </span>
                      {ing.quantity && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">{ing.quantity}</span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="flex items-center gap-2 pt-1">
            {confirmDelete ? (
              <div className="flex items-center gap-2 text-xs flex-1">
                <span className="text-gray-600">Ta bort receptet?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteRecipe.isPending}
                  className="px-2.5 py-1 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-40"
                >
                  Ja, ta bort
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  Avbryt
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Ta bort receptet
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={handleAddSelected}
                  disabled={selectedCount === 0 || addBulk.isPending || justAdded}
                  className={clsx(
                    'px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50',
                    justAdded
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'
                  )}
                >
                  {buttonLabel}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
