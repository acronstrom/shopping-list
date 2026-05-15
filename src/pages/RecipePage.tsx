import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { NewRecipeModal } from '@/components/recipes/NewRecipeModal'
import { useDeleteRecipe, useRecipe } from '@/hooks/useRecipes'
import { useAddGroceriesBulk } from '@/hooks/useGroceries'
import { scaleQuantity } from '@/lib/recipeScale'
import { clsx } from 'clsx'

export function RecipePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading } = useRecipe(id ?? null)
  const addBulk = useAddGroceriesBulk()
  const deleteRecipe = useDeleteRecipe()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [overrideServings, setOverrideServings] = useState<number | null>(null)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [justAddedCount, setJustAddedCount] = useState(0)

  const servings = overrideServings ?? recipe?.servings ?? 4
  const factor = recipe ? servings / (recipe.servings || 1) : 1
  const selectedCount = recipe
    ? recipe.ingredients.filter(i => !skipped.has(i.id)).length
    : 0

  const scaledIngredients = useMemo(() => {
    if (!recipe) return []
    return recipe.ingredients.map(i => ({
      ...i,
      scaledQuantity: scaleQuantity(i.quantity, factor),
    }))
  }, [recipe, factor])

  function toggle(ingredientId: string) {
    setSkipped(prev => {
      const next = new Set(prev)
      if (next.has(ingredientId)) next.delete(ingredientId)
      else next.add(ingredientId)
      return next
    })
  }

  async function handleAddSelected() {
    if (!recipe) return
    const items = scaledIngredients
      .filter(i => !skipped.has(i.id))
      .map(i => ({ name: i.name, quantity: i.scaledQuantity ?? undefined }))
    if (items.length === 0) return
    try {
      await addBulk.mutateAsync(items)
      setJustAddedCount(items.length)
      window.setTimeout(() => setJustAddedCount(0), 1800)
    } catch (err) {
      console.error('[RecipePage] add failed', err)
    }
  }

  async function handleDelete() {
    if (!recipe) return
    try {
      await deleteRecipe.mutateAsync(recipe.id)
      navigate('/recipes', { replace: true })
    } catch (err) {
      console.error('[RecipePage] delete failed', err)
    }
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Recept" />
        <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div>
        <Header title="Recept" />
        <div className="max-w-2xl mx-auto px-4 py-4">
          <p className="text-sm text-gray-500">Receptet hittades inte.</p>
          <button
            type="button"
            onClick={() => navigate('/recipes')}
            className="mt-3 text-sm text-emerald-600 hover:text-emerald-700"
          >
            ← Tillbaka till alla recept
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title={recipe.name} action={{ label: 'Redigera', onClick: () => setEditing(true) }} />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-5">
        <button
          type="button"
          onClick={() => navigate('/recipes')}
          className="self-start text-xs text-gray-500 hover:text-gray-700"
        >
          ← Alla recept
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Portioner</p>
            <p className="text-xs text-gray-400 mt-0.5">Receptet är skrivet för {recipe.servings}.</p>
          </div>
          <div className="flex items-stretch rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setOverrideServings(Math.max(1, servings - 1))}
              className="px-3 text-gray-500 hover:bg-gray-50"
              aria-label="Minska portioner"
            >−</button>
            <span className="px-4 py-2 text-sm font-medium text-gray-900 min-w-[3rem] text-center">
              {servings}
            </span>
            <button
              type="button"
              onClick={() => setOverrideServings(Math.min(99, servings + 1))}
              className="px-3 text-gray-500 hover:bg-gray-50"
              aria-label="Öka portioner"
            >+</button>
          </div>
        </div>

        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Ingredienser
            </h2>
            <button
              type="button"
              onClick={() => setSkipped(skipped.size > 0 ? new Set() : new Set(recipe.ingredients.map(i => i.id)))}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              {skipped.size > 0 ? 'Markera alla' : 'Avmarkera alla'}
            </button>
          </div>
          <ul className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {scaledIngredients.map(ing => {
              const selected = !skipped.has(ing.id)
              return (
                <li key={ing.id}>
                  <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggle(ing.id)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className={clsx('flex-1 min-w-0 text-sm truncate', selected ? 'text-gray-900' : 'text-gray-400 line-through')}>
                      {ing.name}
                    </span>
                    {ing.scaledQuantity && (
                      <span className={clsx('text-xs whitespace-nowrap', selected ? 'text-gray-500' : 'text-gray-300')}>
                        {ing.scaledQuantity}
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>

          <Button
            type="button"
            onClick={handleAddSelected}
            loading={addBulk.isPending}
            disabled={selectedCount === 0 || justAddedCount > 0}
            className={clsx('mt-3 w-full', justAddedCount > 0 && 'bg-emerald-500')}
          >
            {justAddedCount > 0
              ? `${justAddedCount} tillagda i listan`
              : selectedCount === 0
                ? 'Inget valt'
                : selectedCount === recipe.ingredients.length
                  ? `Lägg till alla (${selectedCount})`
                  : `Lägg till markerade (${selectedCount})`}
          </Button>
        </section>

        {recipe.instructions && recipe.instructions.trim().length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
              Instruktioner
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {recipe.instructions}
              </p>
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 pt-2">
            {confirmDelete ? (
              <>
                <span className="text-xs text-gray-600">Ta bort receptet?</span>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  loading={deleteRecipe.isPending}
                >
                  Ja, ta bort
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Avbryt
                </Button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Ta bort receptet
              </button>
            )}
          </div>
        </section>
      </div>

      <NewRecipeModal
        open={editing}
        recipe={recipe}
        onClose={() => setEditing(false)}
      />
    </div>
  )
}
