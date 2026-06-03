import { useState, type FormEvent, useRef, type ChangeEvent } from 'react'
import { useAddGrocery } from '@/hooks/useGroceries'
import { useParseRecipe, type ParsedIngredient } from '@/hooks/useParseRecipe'
import { fileToCompressedDataUrl } from '@/lib/image'
import { dedupeIngredients } from '@/lib/parseIngredient'
import { RecipeImportModal } from './RecipeImportModal'
import { Camera, Plus } from '@/lib/icons'
import { clsx } from 'clsx'

export function AddGroceryForm() {
  const [name, setName] = useState('')
  const [focused, setFocused] = useState(false)
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [recipeError, setRecipeError] = useState<string | null>(null)
  const [ingredients, setIngredients] = useState<ParsedIngredient[]>([])
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
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
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    setIngredients([])
    setRecipeError(null)
    setRecipeOpen(true)
    setProgress({ current: 0, total: files.length })

    try {
      const all: ParsedIngredient[] = []
      for (let i = 0; i < files.length; i++) {
        setProgress({ current: i + 1, total: files.length })
        const dataUrl = await fileToCompressedDataUrl(files[i])
        const parsed = await parseRecipe.mutateAsync(dataUrl)
        all.push(...parsed.ingredients)
      }
      setIngredients(dedupeIngredients(all))
    } catch (err) {
      setRecipeError(err instanceof Error ? err.message : 'Kunde inte läsa receptet')
    } finally {
      setProgress(null)
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
          'flex items-center gap-2.5 bg-surface rounded-[16px] border p-2 pl-4 shadow-card transition-colors duration-200',
          focused ? 'border-clay-line' : 'border-hair'
        )}
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-10 h-10 flex-none grid place-items-center rounded-[12px] bg-surface-2 text-ink-2 border border-hair hover:bg-surface active:scale-95 transition-all"
          aria-label="Läs in från recept"
        >
          <Camera size={20} />
        </button>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Lägg till en vara…"
          className="flex-1 min-w-0 bg-transparent text-[16px] text-ink placeholder:text-ink-4 focus:outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!name.trim() || addGrocery.isPending}
          className={clsx(
            'w-10 h-10 flex-none grid place-items-center rounded-[12px] transition-all duration-200',
            name.trim()
              ? 'bg-clay text-white shadow-[0_6px_16px_-8px_var(--color-clay)] hover:bg-clay-deep active:scale-95'
              : 'bg-surface-2 text-ink-4'
          )}
          aria-label="Lägg till vara"
        >
          <Plus size={20} sw={2.2} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </form>
      <RecipeImportModal
        open={recipeOpen}
        loading={parseRecipe.isPending}
        progress={progress}
        error={recipeError}
        ingredients={ingredients}
        onClose={handleRecipeClose}
        onRetry={handleRecipeRetry}
      />
    </>
  )
}
