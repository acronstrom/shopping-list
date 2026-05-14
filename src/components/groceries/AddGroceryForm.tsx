import { useState, type FormEvent, useRef, type ChangeEvent } from 'react'
import { useAddGrocery } from '@/hooks/useGroceries'
import { useParseRecipe, type ParsedIngredient } from '@/hooks/useParseRecipe'
import { fileToCompressedDataUrl } from '@/lib/image'
import { RecipeImportModal } from './RecipeImportModal'
import { clsx } from 'clsx'

export function AddGroceryForm() {
  const [name, setName] = useState('')
  const [focused, setFocused] = useState(false)
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<ParsedIngredient[]>([])
  const addGrocery = useAddGrocery()
  const parseRecipe = useParseRecipe()
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setName('')
    await addGrocery.mutateAsync({ name: trimmed })
    inputRef.current?.focus()
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIngredients([])
    setRecipeError(null)
    setRecipeOpen(true)

    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      const parsed = await parseRecipe.mutateAsync(dataUrl)
      setIngredients(parsed)
    } catch (err) {
      setRecipeError(err instanceof Error ? err.message : 'Kunde inte läsa receptet')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleRecipeClose() {
    setRecipeOpen(false)
    setIngredients([])
    setRecipeError(null)
  }

  function handleRecipeRetry() {
    setIngredients([])
    setRecipeError(null)
    setRecipeOpen(false)
    fileRef.current?.click()
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={clsx(
          'bg-white rounded-2xl border p-2 transition-all duration-200',
          focused
            ? 'border-emerald-300 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.35)]'
            : 'border-gray-200/80 shadow-sm'
        )}
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 border border-gray-200/80 hover:bg-gray-100 active:scale-95 transition-all"
            aria-label="Läs in från recept"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 0 1 2-2h2.382a1 1 0 0 0 .894-.553l.724-1.447A1 1 0 0 1 9.894 4.5h4.212a1 1 0 0 1 .894.553l.724 1.447A1 1 0 0 0 16.618 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </button>
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Lägg till en vara…"
            className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!name.trim() || addGrocery.isPending}
            className={clsx(
              'w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200',
              name.trim()
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_6px_16px_-6px_rgba(16,185,129,0.6)] hover:from-emerald-500 hover:to-emerald-700 active:scale-95'
                : 'bg-gray-100 text-gray-300'
            )}
            aria-label="Lägg till vara"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </form>
      <RecipeImportModal
        open={recipeOpen}
        loading={parseRecipe.isPending}
        error={recipeError}
        ingredients={ingredients}
        onClose={handleRecipeClose}
        onRetry={handleRecipeRetry}
      />
    </>
  )
}
