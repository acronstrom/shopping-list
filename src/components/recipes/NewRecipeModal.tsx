import { useRef, useState, type ChangeEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useParseRecipe, type ParsedIngredient } from '@/hooks/useParseRecipe'
import { useAddRecipe, type RecipeIngredientInput } from '@/hooks/useRecipes'
import { fileToCompressedDataUrl } from '@/lib/image'
import { clsx } from 'clsx'

interface Props {
  open: boolean
  onClose: () => void
}

interface Row {
  name: string
  quantity: string
}

const EMPTY_ROW: Row = { name: '', quantity: '' }

export function NewRecipeModal({ open, onClose }: Props) {
  const [name, setName] = useState('')
  const [rows, setRows] = useState<Row[]>([{ ...EMPTY_ROW }])
  const [error, setError] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const parseRecipe = useParseRecipe()
  const addRecipe = useAddRecipe()
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setName('')
    setRows([{ ...EMPTY_ROW }])
    setError('')
    setParseError(null)
  }

  function handleClose() {
    reset()
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
      const parsed: ParsedIngredient[] = await parseRecipe.mutateAsync(dataUrl)
      if (parsed.length === 0) {
        setParseError('Inga ingredienser hittades i bilden.')
        return
      }
      // Merge into rows: keep any user-entered rows that already have content,
      // then append the parsed ones.
      const userRows = rows.filter(r => r.name.trim().length > 0)
      const parsedRows: Row[] = parsed.map(p => ({
        name: p.name,
        quantity: p.quantity ?? '',
      }))
      const next = [...userRows, ...parsedRows]
      setRows(next.length > 0 ? next : [{ ...EMPTY_ROW }])
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Kunde inte tolka receptet')
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
    try {
      await addRecipe.mutateAsync({ name: trimmedName, ingredients })
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Det gick inte att spara receptet')
    }
  }

  const ingredientCount = rows.filter(r => r.name.trim().length > 0).length
  const parsing = parseRecipe.isPending

  return (
    <Modal open={open} onClose={handleClose} title="Nytt recept">
      <div className="flex flex-col gap-3">
        <Input
          label="Receptets namn"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="t.ex. Köttbullar med potatismos"
          autoFocus
        />

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

        <div className="max-h-[40vh] overflow-y-auto -mx-1 px-1 flex flex-col gap-1.5">
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

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className={clsx('flex gap-2 pt-2 border-t border-gray-100', error || parseError ? 'mt-0' : 'mt-2')}>
          <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
            Avbryt
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            loading={addRecipe.isPending}
            disabled={!name.trim() || ingredientCount === 0}
            className="flex-1"
          >
            Spara recept
          </Button>
        </div>
      </div>
    </Modal>
  )
}
