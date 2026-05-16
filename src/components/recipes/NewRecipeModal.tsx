import { useRef, useState, type ChangeEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useParseRecipe } from '@/hooks/useParseRecipe'
import { useImportRecipeUrl } from '@/hooks/useImportRecipeUrl'
import { useAddRecipe, useUpdateRecipe, type RecipeIngredientInput } from '@/hooks/useRecipes'
import { fileToCompressedDataUrl } from '@/lib/image'
import { parseIngredientLine } from '@/lib/parseIngredient'
import type { RecipeWithIngredients } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  recipe?: RecipeWithIngredients | null
  onSaved?: (id: string) => void
}

interface Row {
  name: string
  quantity: string
}

const EMPTY_ROW: Row = { name: '', quantity: '' }
const DEFAULT_SERVINGS = 4

function rowsFromRecipe(recipe: RecipeWithIngredients | null | undefined): Row[] {
  if (!recipe || recipe.ingredients.length === 0) return [{ ...EMPTY_ROW }]
  return recipe.ingredients.map(i => ({ name: i.name, quantity: i.quantity ?? '' }))
}

export function NewRecipeModal({ open, onClose, recipe, onSaved }: Props) {
  const editing = !!recipe
  const [seededFor, setSeededFor] = useState<string | null>(null)
  const [name, setName] = useState(recipe?.name ?? '')
  const [instructions, setInstructions] = useState(recipe?.instructions ?? '')
  const [servings, setServings] = useState(recipe?.servings ?? DEFAULT_SERVINGS)
  const [rows, setRows] = useState<Row[]>(() => rowsFromRecipe(recipe))
  const [error, setError] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [urlValue, setUrlValue] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const parseRecipe = useParseRecipe()
  const importUrl = useImportRecipeUrl()
  const addRecipe = useAddRecipe()
  const updateRecipe = useUpdateRecipe()
  const fileRef = useRef<HTMLInputElement>(null)

  // Re-seed when the modal opens with a different recipe (or first open).
  const seedKey = open ? (recipe?.id ?? 'new') : null
  if (seedKey !== seededFor) {
    setSeededFor(seedKey)
    setName(recipe?.name ?? '')
    setInstructions(recipe?.instructions ?? '')
    setServings(recipe?.servings ?? DEFAULT_SERVINGS)
    setRows(rowsFromRecipe(recipe))
    setError('')
    setParseError(null)
    setUrlValue('')
    setUrlError(null)
  }

  function handleClose() {
    onClose()
  }

  function updateRow(idx: number, patch: Partial<Row>) {
    setRows(prev => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  function addRow() {
    setRows(prev => [...prev, { ...EMPTY_ROW }])
  }

  function removeRow(idx: number) {
    setRows(prev => prev.length === 1 ? [{ ...EMPTY_ROW }] : prev.filter((_, i) => i !== idx))
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return

    setParseError(null)
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      const parsed = await parseRecipe.mutateAsync(dataUrl)
      if (parsed.ingredients.length === 0 && !parsed.instructions) {
        setParseError('Inget recept hittades i bilden.')
        return
      }

      if (parsed.ingredients.length > 0) {
        const userRows = rows.filter(r => r.name.trim().length > 0)
        const parsedRows: Row[] = parsed.ingredients.map(p => ({
          name: p.name,
          quantity: p.quantity ?? '',
        }))
        const next = [...userRows, ...parsedRows]
        setRows(next.length > 0 ? next : [{ ...EMPTY_ROW }])
      }

      if (parsed.instructions) {
        // If the user has typed instructions already, append the parsed
        // ones after a blank line so we don't blow their notes away.
        setInstructions(prev => {
          const current = prev.trim()
          if (!current) return parsed.instructions!
          return `${current}\n\n${parsed.instructions}`
        })
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Kunde inte tolka receptet')
    }
  }

  async function handleImportUrl() {
    setUrlError(null)
    const trimmed = urlValue.trim()
    if (!trimmed) {
      setUrlError('Klistra in en länk till receptet.')
      return
    }
    try {
      const imported = await importUrl.mutateAsync(trimmed)
      // Replace name + servings only if they look unset (don't overwrite user typing).
      if (!name.trim()) setName(imported.name)
      if (imported.servings) setServings(imported.servings)

      if (imported.ingredients.length > 0) {
        const userRows = rows.filter(r => r.name.trim().length > 0)
        const importedRows: Row[] = imported.ingredients.map(line => {
          const parsed = parseIngredientLine(line)
          return { name: parsed.name, quantity: parsed.quantity ?? '' }
        })
        const next = [...userRows, ...importedRows]
        setRows(next.length > 0 ? next : [{ ...EMPTY_ROW }])
      }

      if (imported.instructions) {
        setInstructions(prev => {
          const current = prev.trim()
          if (!current) return imported.instructions!
          return `${current}\n\n${imported.instructions}`
        })
      }

      setUrlValue('')
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Kunde inte importera receptet')
    }
  }

  async function handleSave() {
    setError('')
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Receptet behöver ett namn')
      return
    }
    const ingredients: RecipeIngredientInput[] = rows
      .map(r => ({ name: r.name.trim(), quantity: r.quantity.trim() || null }))
      .filter(r => r.name.length > 0)
    if (ingredients.length === 0) {
      setError('Lägg till minst en ingrediens')
      return
    }
    const cleanServings = Math.max(1, Math.min(99, Math.round(servings) || DEFAULT_SERVINGS))
    try {
      if (editing && recipe) {
        await updateRecipe.mutateAsync({
          id: recipe.id,
          name: trimmedName,
          instructions: instructions.trim() || null,
          servings: cleanServings,
          ingredients,
        })
        onSaved?.(recipe.id)
      } else {
        const saved = await addRecipe.mutateAsync({
          name: trimmedName,
          instructions: instructions.trim() || null,
          servings: cleanServings,
          ingredients,
        })
        onSaved?.(saved.id)
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Det gick inte att spara receptet')
    }
  }

  const ingredientCount = rows.filter(r => r.name.trim().length > 0).length
  const parsing = parseRecipe.isPending
  const saving = addRecipe.isPending || updateRecipe.isPending

  const importing = importUrl.isPending

  return (
    <Modal open={open} onClose={handleClose} title={editing ? 'Redigera recept' : 'Nytt recept'}>
      <div className="flex flex-col gap-3">
        {!editing && (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
              <span aria-hidden>🔗</span>
              Importera från länk
            </div>
            <div className="flex gap-2 items-stretch">
              <input
                type="url"
                inputMode="url"
                value={urlValue}
                onChange={e => setUrlValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleImportUrl()
                  }
                }}
                placeholder="https://www.ica.se/recept/…"
                className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleImportUrl}
                loading={importing}
                disabled={!urlValue.trim()}
              >
                Hämta
              </Button>
            </div>
            {urlError && (
              <p className="text-xs text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5">{urlError}</p>
            )}
            <p className="text-[11px] text-gray-500">
              Funkar för ICA, Köket, Allt om Mat och de flesta större receptsajter (schema.org/Recipe).
            </p>
          </div>
        )}

        <Input
          label="Receptets namn"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="t.ex. Köttbullar med potatismos"
          autoFocus={!editing}
        />

        <div className="flex items-end gap-3">
          <label className="flex flex-col gap-1 w-32">
            <span className="text-sm font-medium text-gray-700">Portioner</span>
            <div className="flex items-stretch rounded-xl border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setServings(s => Math.max(1, s - 1))}
                className="px-3 text-gray-500 hover:bg-gray-50"
                aria-label="Minska portioner"
              >−</button>
              <input
                type="number"
                value={servings}
                min={1}
                max={99}
                onChange={e => setServings(Number(e.target.value))}
                className="flex-1 min-w-0 w-full text-center text-sm text-gray-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setServings(s => Math.min(99, s + 1))}
                className="px-3 text-gray-500 hover:bg-gray-50"
                aria-label="Öka portioner"
              >+</button>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Ingredienser
            {ingredientCount > 0 && <span className="ml-1 text-gray-400">· {ingredientCount}</span>}
          </p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            <span aria-hidden>📷</span>
            {parsing ? 'Läser receptet…' : 'Fyll i från foto'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {parsing && (
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            <Spinner className="h-4 w-4" /> Läser ingredienserna…
          </div>
        )}
        {parseError && (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5">{parseError}</p>
        )}

        <div className="max-h-[32vh] overflow-y-auto -mx-1 px-1 flex flex-col gap-1.5">
          {rows.map((row, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={row.name}
                onChange={e => updateRow(idx, { name: e.target.value })}
                placeholder="Ingrediens"
                className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              />
              <input
                type="text"
                value={row.quantity}
                onChange={e => updateRow(idx, { quantity: e.target.value })}
                placeholder="Antal"
                className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={() => removeRow(idx)}
                aria-label="Ta bort ingrediens"
                className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="self-start text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          + Lägg till ingrediens
        </button>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Instruktioner
          </span>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder={'1. Riv löken fint.\n2. Blanda alla ingredienser…'}
            rows={6}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors resize-y"
          />
        </label>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 bg-white/95 backdrop-blur border-t border-gray-100 flex gap-2 mt-2">
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Avbryt
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            loading={saving}
            disabled={!name.trim() || ingredientCount === 0}
            className="flex-1"
          >
            {editing ? 'Spara ändringar' : 'Spara recept'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
