import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Group } from '@/components/ui/Group'
import { NewRecipeModal } from '@/components/recipes/NewRecipeModal'
import {
  useDeleteRecipe,
  useRecipe,
  useRecipeImageUrl,
  useToggleRecipeFavorite,
} from '@/hooks/useRecipes'
import { useAddGroceriesBulk } from '@/hooks/useGroceries'
import { useUpsertMealPlanEntry } from '@/hooks/useMealPlan'
import { scaleQuantity } from '@/lib/recipeScale'
import { splitInstructions } from '@/lib/parseInstructions'
import { dedupeIngredients } from '@/lib/parseIngredient'
import { toIsoDate } from '@/lib/week'
import {
  Book,
  Cart,
  Calendar,
  Check,
  ChevronLeft,
  Flame,
  Heart,
  HeartFill,
  Instagram,
  Link,
  Minus,
  Plus,
} from '@/lib/icons'
import { clsx } from 'clsx'

type Mode = 'shop' | 'cook'

function isInstagramUrl(url: string): boolean {
  try {
    return /(^|\.)instagram\.com$/.test(new URL(url).hostname)
  } catch {
    return false
  }
}

interface ScaledIngredient {
  id: string
  name: string
  scaledQuantity: string | null
  section: string | null
}

interface ShopRow {
  key: string
  name: string
  scaledQuantity: string | null
}

interface CookSectionGroup {
  name: string
  ingredients: ScaledIngredient[]
}

export function RecipePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: recipe, isLoading } = useRecipe(id ?? null)
  const addBulk = useAddGroceriesBulk()
  const deleteRecipe = useDeleteRecipe()
  const toggleFavorite = useToggleRecipeFavorite()
  const upsertPlanEntry = useUpsertMealPlanEntry()
  const { data: heroImageUrl } = useRecipeImageUrl(recipe?.image_path)

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [overrideServings, setOverrideServings] = useState<number | null>(null)
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [ingredientsDone, setIngredientsDone] = useState<Set<string>>(new Set())
  const [stepsDone, setStepsDone] = useState<Set<number>>(new Set())
  const [justAddedCount, setJustAddedCount] = useState(0)
  const [mode, setMode] = useState<Mode>('cook')
  const [planDate, setPlanDate] = useState<string>(toIsoDate(new Date()))
  const [planSavedAt, setPlanSavedAt] = useState<number | null>(null)
  const [planError, setPlanError] = useState<string | null>(null)
  const [showPlanPicker, setShowPlanPicker] = useState(false)

  const servings = overrideServings ?? recipe?.servings ?? 4
  const factor = recipe ? servings / (recipe.servings || 1) : 1

  const scaledIngredients = useMemo<ScaledIngredient[]>(() => {
    if (!recipe) return []
    return recipe.ingredients.map(i => ({
      id: i.id,
      name: i.name,
      scaledQuantity: scaleQuantity(i.quantity, factor),
      section: i.section ?? null,
    }))
  }, [recipe, factor])

  const cookSections = useMemo<CookSectionGroup[]>(() => {
    const groups = new Map<string, ScaledIngredient[]>()
    const order: string[] = []
    for (const ing of scaledIngredients) {
      const key = ing.section ?? ''
      if (!groups.has(key)) {
        groups.set(key, [])
        order.push(key)
      }
      groups.get(key)!.push(ing)
    }
    return order.map(name => ({ name, ingredients: groups.get(name)! }))
  }, [scaledIngredients])

  const shopIngredients = useMemo<ShopRow[]>(() => {
    const deduped = dedupeIngredients(
      scaledIngredients.map(i => ({ name: i.name, quantity: i.scaledQuantity })),
    )
    return deduped.map(i => ({
      key: i.name.trim().toLocaleLowerCase('sv'),
      name: i.name,
      scaledQuantity: i.quantity,
    }))
  }, [scaledIngredients])

  const selectedCount = shopIngredients.filter(i => !skipped.has(i.key)).length

  const steps = useMemo(() => splitInstructions(recipe?.instructions), [recipe?.instructions])

  function toggleSkipped(key: string) {
    setSkipped(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
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
    const items = shopIngredients
      .filter(i => !skipped.has(i.key))
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

  async function handleAddToPlan() {
    if (!recipe) return
    setPlanError(null)
    try {
      await upsertPlanEntry.mutateAsync({ recipeId: recipe.id, plannedDate: planDate })
      setPlanSavedAt(Date.now())
      setShowPlanPicker(false)
      window.setTimeout(() => setPlanSavedAt(null), 2000)
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : 'Kunde inte spara i veckoplanen')
    }
  }

  function handleClearProgress() {
    setIngredientsDone(new Set())
    setStepsDone(new Set())
  }

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
  }

  if (!recipe) {
    return (
      <div className="px-[22px] pt-8">
        <p className="text-sm text-ink-3">Receptet hittades inte.</p>
        <button
          type="button"
          onClick={() => navigate('/recipes')}
          className="mt-3 text-sm text-clay-deep hover:opacity-80"
        >
          ← Tillbaka till alla recept
        </button>
      </div>
    )
  }

  const hasStats =
    !!recipe.prep_time_minutes ||
    !!recipe.cook_time_minutes ||
    (recipe.rating !== null && recipe.rating > 0)

  return (
    <div className="pb-6">
      {/* Hero */}
      <div className="relative">
        {heroImageUrl ? (
          <img src={heroImageUrl} alt="" className="w-full h-[232px] object-cover" />
        ) : (
          <div className="w-full h-[180px] bg-surface-2 grid place-items-center text-ink-4">
            <Book size={40} />
          </div>
        )}
        <button
          type="button"
          onClick={() => navigate('/recipes')}
          aria-label="Tillbaka"
          className="absolute top-3.5 left-3.5 w-9 h-9 rounded-full bg-surface/90 backdrop-blur grid place-items-center text-ink shadow-card"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => toggleFavorite.mutate({ id: recipe.id, is_favorite: !recipe.is_favorite })}
          aria-pressed={recipe.is_favorite}
          aria-label={recipe.is_favorite ? 'Ta bort favorit' : 'Markera som favorit'}
          className={clsx(
            'absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-surface/90 backdrop-blur grid place-items-center shadow-card',
            recipe.is_favorite ? 'text-clay' : 'text-ink-3'
          )}
        >
          {recipe.is_favorite ? <HeartFill size={19} /> : <Heart size={19} />}
        </button>
      </div>

      <div className="px-[22px] pt-[18px]">
        {(recipe.category || recipe.difficulty || (recipe.tags && recipe.tags.length > 0)) && (
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {recipe.category && (
              <span className="px-[11px] py-[5px] rounded-full text-[12px] font-medium bg-clay-tint text-clay-deep border border-clay-line">
                {recipe.category}
              </span>
            )}
            {recipe.difficulty && (
              <span className="px-[11px] py-[5px] rounded-full text-[12px] font-medium bg-surface text-ink-2 border border-hair capitalize">
                {recipe.difficulty}
              </span>
            )}
            {recipe.tags?.map(tag => (
              <span key={tag} className="px-[11px] py-[5px] rounded-full text-[12px] font-medium bg-surface text-ink-2 border border-hair">
                {tag}
              </span>
            ))}
          </div>
        )}

        <h1 className="font-serif text-[30px] font-medium tracking-[-0.02em] leading-[1.04] text-ink">
          {recipe.name}
        </h1>

        {hasStats && (
          <div className="flex gap-[18px] mt-3.5 flex-wrap">
            {recipe.prep_time_minutes ? <Stat label="Förberedelse" value={`${recipe.prep_time_minutes} min`} /> : null}
            {recipe.cook_time_minutes ? <Stat label="Tillagning" value={`${recipe.cook_time_minutes} min`} /> : null}
            {recipe.rating !== null && recipe.rating > 0 && (
              <Stat label="Betyg" value={'★'.repeat(recipe.rating) + '☆'.repeat(5 - recipe.rating)} clay />
            )}
          </div>
        )}

        {/* Portions */}
        <div className="flex items-center justify-between mt-[18px] pt-4 border-t border-hair">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Portioner</div>
            <div className="text-[13px] text-ink-4 mt-0.5">Skrivet för {recipe.servings}</div>
          </div>
          <div className="inline-flex items-center gap-0.5 rounded-[12px] bg-surface-2 border border-hair p-1">
            <button
              type="button"
              onClick={() => setOverrideServings(Math.max(1, servings - 1))}
              className="px-3 py-1.5 text-ink-2 hover:text-ink"
              aria-label="Minska portioner"
            >
              <Minus size={16} />
            </button>
            <span className="font-serif text-[18px] font-medium min-w-[34px] text-center text-ink">{servings}</span>
            <button
              type="button"
              onClick={() => setOverrideServings(Math.min(99, servings + 1))}
              className="px-3 py-1.5 text-ink-2 hover:text-ink"
              aria-label="Öka portioner"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Veckoplan + mode segmented */}
        <div className="flex items-center gap-2.5 mt-4">
          {showPlanPicker ? (
            <div className="flex items-center gap-2 w-full flex-wrap">
              <input
                type="date"
                value={planDate}
                onChange={e => setPlanDate(e.target.value)}
                className="rounded-[12px] border border-hair bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:border-clay-line focus:ring-2 focus:ring-clay/30"
              />
              <Button type="button" variant="clay" size="sm" onClick={handleAddToPlan} loading={upsertPlanEntry.isPending}>
                Spara
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowPlanPicker(false)}>
                Avbryt
              </Button>
            </div>
          ) : (
            <>
              <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={() => setShowPlanPicker(true)}>
                <Calendar size={17} />
                {planSavedAt ? 'Tillagd i veckoplan' : 'Veckoplan'}
              </Button>
              <div className="inline-flex gap-0.5 rounded-full bg-surface-2 border border-hair p-[3px] flex-none">
                <button type="button" onClick={() => setMode('shop')} className={segClass(mode === 'shop')}>
                  <Cart size={15} />
                  Inköp
                </button>
                <button type="button" onClick={() => setMode('cook')} className={segClass(mode === 'cook')}>
                  <Flame size={15} />
                  Laga
                </button>
              </div>
            </>
          )}
        </div>

        {planError && <p className="text-[13px] text-rose bg-rose-tint rounded-[12px] px-2.5 py-1.5 mt-2">{planError}</p>}
        {recipe.source_url &&
          (isInstagramUrl(recipe.source_url) ? (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[14px] font-medium text-white bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] shadow-card active:opacity-90 transition-opacity"
            >
              <Instagram size={17} />
              Öppna reel
            </a>
          ) : (
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-hair bg-surface px-3.5 py-2 text-[14px] font-medium text-ink-2 hover:text-clay-deep active:opacity-90 transition-opacity"
            >
              <Link size={16} />
              Öppna källa
            </a>
          ))}
      </div>

      <div className="px-[18px] pt-6 flex flex-col gap-6">
        {mode === 'shop' ? (
          <ShopSection
            ingredients={shopIngredients}
            skipped={skipped}
            onToggle={toggleSkipped}
            onClearSkipped={() => setSkipped(skipped.size > 0 ? new Set() : new Set(shopIngredients.map(i => i.key)))}
            onAdd={handleAddSelected}
            adding={addBulk.isPending}
            justAddedCount={justAddedCount}
            selectedCount={selectedCount}
            totalCount={shopIngredients.length}
          />
        ) : (
          <CookSection
            sections={cookSections}
            ingredientsDone={ingredientsDone}
            onToggleIngredient={toggleIngredientDone}
            steps={steps}
            stepsDone={stepsDone}
            onToggleStep={toggleStepDone}
            onClearProgress={handleClearProgress}
          />
        )}

        {/* Edit + delete */}
        <div className="flex items-center gap-4 pt-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[13px] font-medium text-ink-2 hover:text-ink transition-colors"
          >
            Redigera receptet
          </button>
          {confirmDelete ? (
            <span className="flex items-center gap-2 ml-auto">
              <span className="text-[13px] text-ink-3">Ta bort?</span>
              <Button type="button" variant="danger" size="sm" onClick={handleDelete} loading={deleteRecipe.isPending}>
                Ja, ta bort
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Avbryt
              </Button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="ml-auto text-[13px] text-ink-4 hover:text-rose transition-colors"
            >
              Ta bort receptet
            </button>
          )}
        </div>
      </div>

      <NewRecipeModal open={editing} recipe={recipe} onClose={() => setEditing(false)} />
    </div>
  )
}

function segClass(active: boolean) {
  return clsx(
    'inline-flex items-center gap-1.5 px-[15px] py-[7px] rounded-full text-[13.5px] font-medium transition-all',
    active ? 'bg-surface text-ink shadow-[0_1px_2px_oklch(0.4_0.02_60/0.12)]' : 'text-ink-3 hover:text-ink-2'
  )
}

function Stat({ label, value, clay }: { label: string; value: string; clay?: boolean }) {
  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-1">{label}</div>
      <div className={clsx('font-serif text-[18px] font-medium', clay ? 'text-clay' : 'text-ink')}>{value}</div>
    </div>
  )
}

// ============================================================
// Shop mode: ingredient checkboxes + "Lägg till markerade"
// ============================================================

interface ShopSectionProps {
  ingredients: ShopRow[]
  skipped: Set<string>
  onToggle: (key: string) => void
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
      <div className="flex items-center justify-between px-1.5 pb-1">
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Ingredienser</span>
        <button type="button" onClick={onClearSkipped} className="text-[13px] font-medium text-clay-deep hover:opacity-80">
          {skipped.size > 0 ? 'Markera alla' : 'Avmarkera alla'}
        </button>
      </div>
      <p className="text-[13px] text-ink-3 px-1.5 pb-2.5">
        Bocka av sånt du redan har — bara markerade läggs till.
      </p>
      <Group divider>
        {ingredients.map(ing => {
          const selected = !skipped.has(ing.key)
          return (
            <label key={ing.key} className="flex items-center gap-3 px-4 py-3.5 cursor-pointer">
              <input type="checkbox" checked={selected} onChange={() => onToggle(ing.key)} className="sr-only" />
              <span
                className={clsx(
                  'w-[22px] h-[22px] rounded-[7px] border-[1.8px] grid place-items-center flex-none transition-colors',
                  selected ? 'bg-clay border-clay text-white' : 'bg-surface border-hair'
                )}
                aria-hidden
              >
                {selected && <Check size={13} />}
              </span>
              <span className={clsx('flex-1 min-w-0 text-[16px] truncate', selected ? 'text-ink' : 'text-ink-4 line-through')}>
                {ing.name}
              </span>
              {ing.scaledQuantity && (
                <span className={clsx('text-[15px] tabular-nums whitespace-nowrap flex-none', selected ? 'text-ink-3' : 'text-ink-4')}>
                  {ing.scaledQuantity}
                </span>
              )}
            </label>
          )
        })}
      </Group>

      <Button
        type="button"
        variant="clay"
        size="lg"
        onClick={onAdd}
        loading={adding}
        disabled={selectedCount === 0 || justAddedCount > 0}
        className="mt-4 w-full"
      >
        {justAddedCount === 0 && <Plus size={19} />}
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
  sections: CookSectionGroup[]
  ingredientsDone: Set<string>
  onToggleIngredient: (id: string) => void
  steps: string[]
  stepsDone: Set<number>
  onToggleStep: (index: number) => void
  onClearProgress: () => void
}

function CookSection({
  sections,
  ingredientsDone,
  onToggleIngredient,
  steps,
  stepsDone,
  onToggleStep,
  onClearProgress,
}: CookSectionProps) {
  const totalIngredients = sections.reduce((sum, s) => sum + s.ingredients.length, 0)
  const progressTotal = totalIngredients + steps.length
  const progressDone = ingredientsDone.size + stepsDone.size
  const hasNamedSections = sections.some(s => s.name.trim().length > 0)

  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">Ingredienser</span>
          {progressDone > 0 && (
            <button type="button" onClick={onClearProgress} className="text-[13px] font-medium text-clay-deep hover:opacity-80">
              Återställ ({progressDone}/{progressTotal})
            </button>
          )}
        </div>
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="flex flex-col gap-1.5">
            {hasNamedSections && (
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3 px-1.5">
                {section.name.trim() || 'Huvudingredienser'}
              </h3>
            )}
            <Group divider>
              {section.ingredients.map(ing => {
                const done = ingredientsDone.has(ing.id)
                return (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => onToggleIngredient(ing.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-surface-2 transition-colors"
                  >
                    <span
                      className={clsx(
                        'w-[22px] h-[22px] rounded-full border-[1.8px] flex-none grid place-items-center transition-all',
                        done ? 'bg-clay border-clay text-white' : 'border-hair bg-surface'
                      )}
                      aria-hidden
                    >
                      {done && <Check size={13} />}
                    </span>
                    <span className={clsx('flex-1 min-w-0 text-[17px] truncate', done ? 'text-ink-4 line-through' : 'text-ink')}>
                      {ing.name}
                    </span>
                    {ing.scaledQuantity && (
                      <span className={clsx('text-[16px] font-medium tabular-nums whitespace-nowrap flex-none', done ? 'text-ink-4' : 'text-ink-2')}>
                        {ing.scaledQuantity}
                      </span>
                    )}
                  </button>
                )
              })}
            </Group>
          </div>
        ))}
      </section>

      {steps.length > 0 ? (
        <section>
          <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3 px-1.5 pb-2">Gör så här</div>
          <ol className="flex flex-col gap-2.5">
            {steps.map((step, idx) => {
              const done = stepsDone.has(idx)
              return (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => onToggleStep(idx)}
                    className="w-full bg-surface rounded-group shadow-card border border-hair text-left p-4 flex gap-3.5 transition-all"
                  >
                    <span
                      className={clsx(
                        'flex-none w-[30px] h-[30px] rounded-full grid place-items-center text-[14px] font-semibold font-serif transition-colors',
                        done ? 'bg-clay text-white' : 'bg-clay-tint text-clay-deep'
                      )}
                      aria-hidden
                    >
                      {done ? <Check size={15} /> : idx + 1}
                    </span>
                    <p className={clsx('text-[15.5px] leading-relaxed pt-1', done ? 'text-ink-4' : 'text-ink')}>
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
          <p className="text-sm text-ink-3 bg-surface rounded-group shadow-card border border-hair p-4">
            Inga instruktioner än. Lägg till dem via <strong>Redigera</strong>.
          </p>
        </section>
      )}
    </>
  )
}
