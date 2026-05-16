import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { NewRecipeModal } from '@/components/recipes/NewRecipeModal'
import { useDeleteRecipe, useRecipe } from '@/hooks/useRecipes'
import { useAddGroceriesBulk } from '@/hooks/useGroceries'
import { scaleQuantity } from '@/lib/recipeScale'
import { splitInstructions } from '@/lib/parseInstructions'
import { clsx } from 'clsx'

type Mode = 'shop' | 'cook'

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
  const [ingredientsDone, setIngredientsDone] = useState<Set<string>>(new Set())
  const [stepsDone, setStepsDone] = useState<Set<number>>(new Set())
  const [justAddedCount, setJustAddedCount] = useState(0)
  const [mode, setMode] = useState<Mode>('shop')

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

  const steps = useMemo(() => splitInstructions(recipe?.instructions), [recipe?.instructions])

  function toggleSkipped(ingredientId: string) {
    setSkipped(prev => {
      const next = new Set(prev)
      if (next.has(ingredientId)) next.delete(ingredientId)
      else next.add(ingredientId)
      return next
    })
  }

  function toggleIngredientDone(ingredientId: string) {
    setIngredientsDone(prev => {
      const next = new Set(prev)
      if (next.has(ingredientId)) next.delete(ingredientId)
      else next.add(ingredientId)
      return next
    })
  }

  function toggleStepDone(index: number) {
    setStepsDone(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
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

  function handleClearProgress() {
    setIngredientsDone(new Set())
    setStepsDone(new Set())
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
    <div className="pb-12">
      <Header title={recipe.name} action={{ label: 'Redigera', onClick: () => setEditing(true) }} />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate('/recipes')}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            ← Alla recept
          </button>
          <div role="tablist" aria-label="Läge" className="inline-flex rounded-full bg-gray-100/80 p-1 border border-gray-200/60">
            {(['shop', 'cook'] as Mode[]).map(option => {
              const active = mode === option
              return (
                <button
                  key={option}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setMode(option)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all',
                    active
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <span aria-hidden>{option === 'shop' ? '🛒' : '🍳'}</span>
                  {option === 'shop' ? 'Inköp' : 'Laga'}
                </button>
              )
            })}
          </div>
        </div>

        <header className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight leading-tight">
            {recipe.name}
          </h1>
          <div className="flex items-center justify-between gap-3">
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
              <span className="px-4 py-2 text-base font-semibold text-gray-900 min-w-[3rem] text-center">
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
        </header>

        {mode === 'shop' ? (
          <ShopSection
            ingredients={scaledIngredients}
            skipped={skipped}
            onToggle={toggleSkipped}
            onClearSkipped={() => setSkipped(skipped.size > 0 ? new Set() : new Set(recipe.ingredients.map(i => i.id)))}
            onAdd={handleAddSelected}
            adding={addBulk.isPending}
            justAddedCount={justAddedCount}
            selectedCount={selectedCount}
            totalCount={recipe.ingredients.length}
          />
        ) : (
          <CookSection
            ingredients={scaledIngredients}
            ingredientsDone={ingredientsDone}
            onToggleIngredient={toggleIngredientDone}
            steps={steps}
            stepsDone={stepsDone}
            onToggleStep={toggleStepDone}
            onClearProgress={handleClearProgress}
          />
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

// ============================================================
// Shop mode: ingredient checkboxes + "Lägg till markerade"
// ============================================================

interface ShopSectionProps {
  ingredients: Array<{ id: string; name: string; scaledQuantity: string | null }>
  skipped: Set<string>
  onToggle: (id: string) => void
  onClearSkipped: () => void
  onAdd: () => void
  adding: boolean
  justAddedCount: number
  selectedCount: number
  totalCount: number
}

function ShopSection({
  ingredients,
  skipped,
  onToggle,
  onClearSkipped,
  onAdd,
  adding,
  justAddedCount,
  selectedCount,
  totalCount,
}: ShopSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Ingredienser
        </h2>
        <button
          type="button"
          onClick={onClearSkipped}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
        >
          {skipped.size > 0 ? 'Markera alla' : 'Avmarkera alla'}
        </button>
      </div>
      <p className="text-xs text-gray-500 px-1 mb-2">
        Bocka av sånt du redan har hemma — bara markerade läggs till.
      </p>
      <ul className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
        {ingredients.map(ing => {
          const selected = !skipped.has(ing.id)
          return (
            <li key={ing.id}>
              <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/80 transition-colors">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggle(ing.id)}
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
        onClick={onAdd}
        loading={adding}
        disabled={selectedCount === 0 || justAddedCount > 0}
        className={clsx('mt-3 w-full', justAddedCount > 0 && 'bg-emerald-500')}
      >
        {justAddedCount > 0
          ? `${justAddedCount} tillagda i listan`
          : selectedCount === 0
            ? 'Inget valt'
            : selectedCount === totalCount
              ? `Lägg till alla (${selectedCount})`
              : `Lägg till markerade (${selectedCount})`}
      </Button>
    </section>
  )
}

// ============================================================
// Cook mode: tap-to-mark-done ingredients + stepped instructions
// ============================================================

interface CookSectionProps {
  ingredients: Array<{ id: string; name: string; scaledQuantity: string | null }>
  ingredientsDone: Set<string>
  onToggleIngredient: (id: string) => void
  steps: string[]
  stepsDone: Set<number>
  onToggleStep: (index: number) => void
  onClearProgress: () => void
}

function CookSection({
  ingredients,
  ingredientsDone,
  onToggleIngredient,
  steps,
  stepsDone,
  onToggleStep,
  onClearProgress,
}: CookSectionProps) {
  const progressTotal = ingredients.length + steps.length
  const progressDone = ingredientsDone.size + stepsDone.size

  return (
    <>
      <section>
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Ingredienser
          </h2>
          {progressDone > 0 && (
            <button
              type="button"
              onClick={onClearProgress}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
            >
              Återställ ({progressDone}/{progressTotal})
            </button>
          )}
        </div>
        <ul className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
          {ingredients.map(ing => {
            const done = ingredientsDone.has(ing.id)
            return (
              <li key={ing.id}>
                <button
                  type="button"
                  onClick={() => onToggleIngredient(ing.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/80 transition-colors"
                >
                  <span
                    className={clsx(
                      'inline-flex w-5 h-5 rounded-full border-2 flex-shrink-0 items-center justify-center transition-all',
                      done
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-gray-300 bg-white'
                    )}
                    aria-hidden
                  >
                    {done && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={clsx('flex-1 min-w-0 text-base truncate', done ? 'text-gray-400 line-through' : 'text-gray-900')}>
                    {ing.name}
                  </span>
                  {ing.scaledQuantity && (
                    <span className={clsx('text-sm font-medium tabular-nums whitespace-nowrap', done ? 'text-gray-300' : 'text-gray-700')}>
                      {ing.scaledQuantity}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {steps.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
            Gör så här
          </h2>
          <ol className="flex flex-col gap-2">
            {steps.map((step, idx) => {
              const done = stepsDone.has(idx)
              return (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => onToggleStep(idx)}
                    className={clsx(
                      'w-full bg-white rounded-2xl shadow-sm border text-left p-4 flex gap-3 transition-all',
                      done
                        ? 'border-emerald-200/70 bg-emerald-50/40'
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                    )}
                  >
                    <span
                      className={clsx(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                        done
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-50 text-amber-700'
                      )}
                      aria-hidden
                    >
                      {done ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <p className={clsx('text-base leading-relaxed pt-0.5', done ? 'text-gray-400' : 'text-gray-800')}>
                      {step}
                    </p>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      ) : (
        <section>
          <p className="text-sm text-gray-400 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            Inga instruktioner än. Lägg till dem via <strong>Redigera</strong>.
          </p>
        </section>
      )}
    </>
  )
}
