import { useNavigate } from 'react-router-dom'
import { useRecipeImageUrl } from '@/hooks/useRecipes'
import type { RecipeWithIngredients } from '@/types'

interface Props {
  recipe: RecipeWithIngredients
}

export function RecipeCard({ recipe }: Props) {
  const navigate = useNavigate()
  const ingredientCount = recipe.ingredients.length
  const hasInstructions = !!recipe.instructions?.trim()
  const { data: imageUrl } = useRecipeImageUrl(recipe.image_path)

  const totalMinutes = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0)
  const showTime = totalMinutes > 0

  return (
    <button
      type="button"
      onClick={() => navigate(`/recipes/${recipe.id}`)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 text-left hover:shadow-md hover:border-gray-200 transition-all active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        {imageUrl ? (
          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
            <img src={imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-xl" aria-hidden>📖</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-gray-900 truncate">{recipe.name}</p>
            {recipe.is_favorite && (
              <span aria-label="Favorit" className="text-rose-500 text-xs">♥</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-400 mt-0.5">
            <span>
              {ingredientCount === 0
                ? 'Inga ingredienser'
                : `${ingredientCount} ${ingredientCount === 1 ? 'ingrediens' : 'ingredienser'}`}
            </span>
            <span>·</span>
            <span>{recipe.servings} portioner</span>
            {showTime && (
              <>
                <span>·</span>
                <span>⏱ {totalMinutes} min</span>
              </>
            )}
            {hasInstructions && (
              <>
                <span>·</span>
                <span>Med instruktioner</span>
              </>
            )}
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
