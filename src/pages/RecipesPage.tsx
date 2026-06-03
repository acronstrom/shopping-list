import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, HeaderIconButton } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { Group, GroupHeader } from '@/components/ui/Group'
import { RecipeCard } from '@/components/recipes/RecipeCard'
import { NewRecipeModal } from '@/components/recipes/NewRecipeModal'
import { useRecipes, useSetRecipeCategory, useRecipeImageUrl } from '@/hooks/useRecipes'
import { useHouseholdRecipeCategories } from '@/hooks/useRecipeCategories'
import { useCategorizeRecipe } from '@/hooks/useCategorizeRecipe'
import { Plus, Search, Book, Clock, HeartFill } from '@/lib/icons'
import type { RecipeWithIngredients } from '@/types'

const UNCATEGORIZED_KEY = '__uncategorized__'

interface CategoryGroup {
  key: string
  name: string
  recipes: RecipeWithIngredients[]
}

export function RecipesPage() {
  const navigate = useNavigate()
  const { data: recipes = [], isLoading } = useRecipes()
  const { data: categories = [] } = useHouseholdRecipeCategories()
  const categorizeRecipe = useCategorizeRecipe()
  const setCategory = useSetRecipeCategory()

  const [modalOpen, setModalOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [backfilling, setBackfilling] = useState(false)
  const [backfillError, setBackfillError] = useState<string | null>(null)

  const filteredRecipes = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter(
      r =>
        r.name.toLowerCase().includes(q) ||
        r.ingredients.some(i => i.name.toLowerCase().includes(q))
    )
  }, [recipes, query])

  const featured = useMemo(() => recipes.find(r => r.is_favorite) ?? null, [recipes])

  const groups = useMemo<CategoryGroup[]>(() => {
    const categoryByName = new Map<string, { name: string; sort: number }>()
    for (const c of categories) categoryByName.set(c.name, { name: c.name, sort: c.sort_order })
    const buckets = new Map<string, RecipeWithIngredients[]>()
    const seenOrder: string[] = []
    for (const recipe of filteredRecipes) {
      const key = recipe.category && recipe.category.trim().length > 0 ? recipe.category : UNCATEGORIZED_KEY
      if (!buckets.has(key)) {
        buckets.set(key, [])
        seenOrder.push(key)
      }
      buckets.get(key)!.push(recipe)
    }

    const known: CategoryGroup[] = []
    for (const c of [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))) {
      const items = buckets.get(c.name)
      if (items && items.length > 0) known.push({ key: c.name, name: c.name, recipes: items })
    }
    const knownNames = new Set(categoryByName.keys())
    const orphans: CategoryGroup[] = []
    for (const key of seenOrder) {
      if (key === UNCATEGORIZED_KEY) continue
      if (knownNames.has(key)) continue
      orphans.push({ key, name: key, recipes: buckets.get(key)! })
    }
    orphans.sort((a, b) => a.name.localeCompare(b.name))

    const uncategorized = buckets.get(UNCATEGORIZED_KEY)
    const tail: CategoryGroup[] =
      uncategorized && uncategorized.length > 0
        ? [{ key: UNCATEGORIZED_KEY, name: 'Ingen kategori', recipes: uncategorized }]
        : []

    return [...known, ...orphans, ...tail]
  }, [filteredRecipes, categories])

  const uncategorizedCount = recipes.filter(r => !r.category || r.category.trim().length === 0).length

  async function handleBackfill() {
    if (backfilling) return
    setBackfillError(null)
    setBackfilling(true)
    try {
      const targets = recipes.filter(r => !r.category || r.category.trim().length === 0)
      for (const recipe of targets) {
        const ingredientNames = recipe.ingredients.map(i => i.name)
        const aiCategory = await categorizeRecipe.mutateAsync({ recipeName: recipe.name, ingredientNames })
        if (aiCategory) await setCategory.mutateAsync({ id: recipe.id, category: aiCategory })
      }
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Kunde inte kategorisera alla recept')
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={`${recipes.length} recept`}
        title="Recept"
        right={
          <HeaderIconButton aria-label="Nytt recept" onClick={() => setModalOpen(true)}>
            <Plus size={20} />
          </HeaderIconButton>
        }
      />
      <div className="px-[18px] pt-2 flex flex-col gap-[18px]">
        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>
        ) : recipes.length === 0 ? (
          <EmptyState
            icon="📖"
            title="Inga recept än"
            description="Spara recept du lagar ofta så kan du lägga till hela ingredienslistan med ett par klick."
            action={{ label: 'Lägg till ditt första recept', onClick: () => setModalOpen(true) }}
          />
        ) : (
          <>
            <div className="flex items-center gap-2.5 bg-surface border border-hair rounded-[16px] px-4 py-3 shadow-card text-ink-3">
              <Search size={19} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Sök recept eller ingrediens…"
                className="flex-1 min-w-0 bg-transparent text-[16px] text-ink placeholder:text-ink-4 focus:outline-none"
                autoComplete="off"
              />
            </div>

            {!query && featured && <FeaturedRecipe recipe={featured} />}

            {uncategorizedCount > 0 && (
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-[13px] text-ink-3">{uncategorizedCount} recept saknar kategori.</p>
                <button
                  type="button"
                  onClick={handleBackfill}
                  disabled={backfilling}
                  className="text-[13px] font-medium text-clay-deep hover:opacity-80 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {backfilling && <Spinner className="h-3 w-3" />}
                  {backfilling ? 'Kategoriserar…' : `Kategorisera saknande (${uncategorizedCount})`}
                </button>
              </div>
            )}
            {backfillError && (
              <p className="text-[13px] text-rose bg-rose-tint rounded-[12px] px-3 py-2">{backfillError}</p>
            )}

            {groups.length === 0 ? (
              <p className="text-sm text-ink-3 text-center py-10">Inga recept matchar "{query}".</p>
            ) : (
              groups.map(group => (
                <div key={group.key} className="flex flex-col">
                  <GroupHeader>
                    {group.name}
                    <span className="text-ink-4 font-normal normal-case tracking-normal">· {group.recipes.length}</span>
                  </GroupHeader>
                  <Group divider>
                    {group.recipes.map(recipe => (
                      <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                  </Group>
                </div>
              ))
            )}
          </>
        )}
      </div>

      <NewRecipeModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={id => navigate(`/recipes/${id}`)} />
    </div>
  )
}

function FeaturedRecipe({ recipe }: { recipe: RecipeWithIngredients }) {
  const navigate = useNavigate()
  const { data: imageUrl } = useRecipeImageUrl(recipe.image_path)
  const totalMinutes = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0)

  return (
    <div>
      <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3 mb-2.5">Veckans förslag</div>
      <button
        type="button"
        onClick={() => navigate(`/recipes/${recipe.id}`)}
        className="block w-full text-left rounded-card bg-surface border border-hair shadow-card overflow-hidden active:opacity-95 transition-opacity"
      >
        <div className="relative">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="w-full h-[188px] object-cover" />
          ) : (
            <div className="w-full h-[188px] bg-surface-2 grid place-items-center text-ink-4">
              <Book size={40} />
            </div>
          )}
          <span className="absolute top-3 right-3 w-9 h-9 rounded-full bg-surface/90 grid place-items-center text-clay shadow-card">
            <HeartFill size={18} />
          </span>
          {recipe.category && (
            <span className="absolute left-3 top-3 px-3 py-1.5 rounded-full text-[12px] font-medium bg-surface/90 text-clay-deep">
              {recipe.category}
            </span>
          )}
        </div>
        <div className="px-4 pt-3.5 pb-4">
          <div className="font-serif text-[23px] font-medium tracking-[-0.015em] leading-[1.1] text-ink">
            {recipe.name}
          </div>
          <div className="text-[13px] text-ink-3 mt-1.5 flex items-center gap-1.5">
            {totalMinutes > 0 && (
              <>
                <Clock size={14} /> {totalMinutes} min <span className="text-ink-4">·</span>
              </>
            )}
            {recipe.servings} portioner
          </div>
        </div>
      </button>
    </div>
  )
}
