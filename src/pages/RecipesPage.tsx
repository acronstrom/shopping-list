import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { RecipeCard } from '@/components/recipes/RecipeCard'
import { NewRecipeModal } from '@/components/recipes/NewRecipeModal'
import { useRecipes } from '@/hooks/useRecipes'

export function RecipesPage() {
  const { data: recipes = [], isLoading } = useRecipes()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div>
      <Header title="Recept" action={{ label: '+ Nytt recept', onClick: () => setModalOpen(true) }} />
      <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3">
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
          recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)
        )}
      </div>

      <NewRecipeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
