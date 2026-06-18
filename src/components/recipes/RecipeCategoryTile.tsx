import { useRecipeImageUrl } from '@/hooks/useRecipes'
import { Book, ChevronRight } from '@/lib/icons'

interface Props {
  name: string
  count: number
  imagePath?: string | null
  onClick: () => void
}

// A tappable category card on the recipe landing view. Shows a representative
// recipe image when one is available, otherwise a Book glyph (same fallback as
// RecipeCard).
export function RecipeCategoryTile({ name, count, imagePath, onClick }: Props) {
  const { data: imageUrl } = useRecipeImageUrl(imagePath ?? undefined)

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-card bg-surface border border-hair shadow-card overflow-hidden active:opacity-95 transition-opacity"
    >
      <div className="relative h-[92px] bg-surface-2">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-ink-4">
            <Book size={26} />
          </div>
        )}
      </div>
      <div className="px-3.5 py-3 flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="font-serif text-[17px] font-medium tracking-[-0.01em] text-ink truncate">
            {name}
          </div>
          <div className="text-[13px] text-ink-3 mt-0.5">{count} recept</div>
        </div>
        <ChevronRight size={16} className="text-ink-4 flex-none" />
      </div>
    </button>
  )
}
