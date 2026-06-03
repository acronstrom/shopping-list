import { useNavigate } from 'react-router-dom'
import { useRecipeImageUrl } from '@/hooks/useRecipes'
import { Book, HeartFill, ChevronRight } from '@/lib/icons'
import type { RecipeWithIngredients } from '@/types'

interface Props {
  recipe: RecipeWithIngredients
}

export function RecipeCard({ recipe }: Props) {
  const navigate = useNavigate()
  const ingredientCount = recipe.ingredients.length
  const { data: imageUrl } = useRecipeImageUrl(recipe.image_path)

  const totalMinutes = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0)

  const meta: string[] = [
    ingredientCount === 0
      ? 'Inga ingredienser'
      : `${ingredientCount} ${ingredientCount === 1 ? 'ingrediens' : 'ingredienser'}`,
  ]
  if (totalMinutes > 0) meta.push(`${totalMinutes} min`)
  else meta.push(`${recipe.servings} portioner`)

  return (
    <button
      type="button"
      onClick={() => navigate(`/recipes/${recipe.id}`)}
      className="flex items-center gap-3 px-3.5 py-3 text-left w-full active:bg-surface-2 transition-colors"
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-[52px] h-[52px] rounded-[13px] object-cover flex-none bg-surface-2" />
      ) : (
        <div className="w-[52px] h-[52px] rounded-[13px] bg-surface-2 border border-hair grid place-items-center text-ink-3 flex-none">
          <Book size={22} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-serif text-[18px] font-medium tracking-[-0.01em] text-ink truncate">
            {recipe.name}
          </span>
          {recipe.is_favorite && (
            <span className="text-clay flex-none" aria-label="Favorit">
              <HeartFill size={14} />
            </span>
          )}
        </div>
        <div className="text-[13px] text-ink-3 mt-0.5 flex items-center gap-1.5">
          {meta.map((m, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-ink-4">·</span>}
              {m}
            </span>
          ))}
        </div>
      </div>
      <ChevronRight size={17} className="text-ink-4 flex-none" />
    </button>
  )
}
