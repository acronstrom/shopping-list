import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { RecipeCard } from '@/components/recipes/RecipeCard'
import { NewRecipeModal } from '@/components/recipes/NewRecipeModal'
import { useRecipes, useSetRecipeCategory } from '@/hooks/useRecipes'
import { useHouseholdRecipeCategories } from '@/hooks/useRecipeCategories'
import { useCategorizeRecipe } from '@/hooks/useCategorizeRecipe'
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
  const [backfilling, setBackfilling] = useState(false)
  const [backfillError, setBackfillError] = useState<string | null>(null)

  const groups = useMemo<CategoryGroup[]>(() => {
    const categoryByName = new Map<string, { name: string; sort: number }>()
    for (const c of categories) {
      categoryByName.set(c.name, { name: c.name, sort: c.sort_order })
    }
    const buckets = new Map<string, RecipeWithIngredients[]>()
    const seenOrder: string[] = []
    for (const recipe of recipes) {
      const key = recipe.category && recipe.category.trim().length > 0
        ? recipe.category
        : UNCATEGORIZED_KEY
      if (!buckets.has(key)) {
        buckets.set(key, [])
        seenOrder.push(key)
      }
      buckets.get(key)!.push(recipe)
    }

    const known: CategoryGroup[] = []
    for (const c of [...categories].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))) {
      const items = buckets.get(c.name)
      if (items && items.length > 0) {
        known.push({ key: c.name, name: c.name, recipes: items })
      }
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
    const tail: CategoryGroup[] = uncategorized && uncategorized.length > 0
      ? [{ key: UNCATEGORIZED_KEY, name: 'Ingen kategori', recipes: uncategorized }]
      : []

    return [...known, ...orphans, ...tail]
  }, [recipes, categories])

  const uncategorizedCount = recipes.filter(
    r => !r.category || r.category.trim().length === 0
  ).length

  async function handleBackfill() {
    if (backfilling) return
    setBackfillError(null)
    setBackfilling(true)
    try {
      const targets = recipes.filter(r => !r.category || r.category.trim().length === 0)
      for (const recipe of targets) {
        const ingredientNames = recipe.ingredients.map(i => i.name)
        const aiCategory = await categorizeRecipe.mutateAsync({
          recipeName: recipe.name,
          ingredientNames,
        })
        if (aiCategory) {
          await setCategory.mutateAsync({ id: recipe.id, category: aiCategory })
        }
      }
    } catch (err) {
      setBackfillError(err instanceof Error ? err.message : 'Kunde inte kategorisera alla recept')
    } finally {
      setBackfilling(false)
    }
  }

  return (
    <div>
      <Header title="Recept" action={{ label: '+ Nytt recept', onClick: () => setModalOpen(true) }} />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-4">
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
            {uncategorizedCount > 0 && (
              <div className="flex items-center justify-between gap-2 px-1">
                <p className="text-xs text-gray-500">
                  {uncategorizedCount} recept saknar kategori.
                </p>
                <button
                  type="button"
                  onClick={handleBackfill}
                  disabled={backfilling}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {backfilling && <Spinner className="h-3 w-3" />}
                  {backfilling ? `Kategoriserar…` : `Kategorisera saknande (${uncategorizedCount})`}
                </button>
              </div>
            )}
            {backfillError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{backfillError}</p>
            )}
            {groups.map(group => (
              <section key={group.key} className="flex flex-col gap-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                  {group.name}
                  <span className="ml-1 text-gray-400 font-normal">· {group.recipes.length}</span>
                </h2>
                <div className="flex flex-col gap-2">
                  {group.recipes.map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </div>

      <NewRecipeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(id) => navigate(`/recipes/${id}`)}
      />
    </div>
  )
}
