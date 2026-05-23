import { useRef, useState, type ChangeEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { useParseRecipe, type ParsedIngredient } from '@/hooks/useParseRecipe'
import { useImportRecipeUrl } from '@/hooks/useImportRecipeUrl'
import { useAddRecipe, useUpdateRecipe, type RecipeIngredientInput } from '@/hooks/useRecipes'
import { fileToCompressedDataUrl } from '@/lib/image'
import { dedupeIngredientsBySection, parseIngredientLine } from '@/lib/parseIngredient'
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

interface Section {
  name: string
  rows: Row[]
}

const EMPTY_ROW: Row = { name: '', quantity: '' }
const DEFAULT_SECTIONS: Section[] = [{ name: '', rows: [{ ...EMPTY_ROW }] }]
const DEFAULT_SERVINGS = 4

function sectionsFromRecipe(recipe: RecipeWithIngredients | null | undefined): Section[] {
  if (!recipe || recipe.ingredients.length === 0) {
    return [{ name: '', rows: [{ ...EMPTY_ROW }] }]
  }
  const groups = new Map<string, Row[]>()
  const order: string[] = []
  for (const ing of recipe.ingredients) {
    const key = ing.section ?? ''
    if (!groups.has(key)) {
      groups.set(key, [])
      order.push(key)
    }
    groups.get(key)!.push({ name: ing.name, quantity: ing.quantity ?? '' })
  }
  return order.map(name => ({ name, rows: groups.get(name)! }))
}

function sectionsWithoutEmptyRows(sections: Section[]): Section[] {
  return sections
    .map(s => ({ ...s, rows: s.rows.filter(r => r.name.trim().length > 0) }))
    .filter(s => s.rows.length > 0 || s.name.trim().length > 0)
}

function ensureNonEmpty(sections: Section[]): Section[] {
  if (sections.length === 0) return [{ name: '', rows: [{ ...EMPTY_ROW }] }]
  return sections.map(s => (s.rows.length === 0 ? { ...s, rows: [{ ...EMPTY_ROW }] } : s))
}

function applyParsedToSections(current: Section[], parsed: ParsedIngredient[]): Section[] {
  if (parsed.length === 0) return current

  const deduped = dedupeIngredientsBySection(parsed)
  const bySection = new Map<string, Row[]>()
  const order: string[] = []
  for (const p of deduped) {
    const key = p.section ?? ''
    if (!bySection.has(key)) {
      bySection.set(key, [])
      order.push(key)
    }
    bySection.get(key)!.push({ name: p.name, quantity: p.quantity ?? '' })
  }

  const next = sectionsWithoutEmptyRows(current).map(s => ({ ...s, rows: [...s.rows] }))

  for (const key of order) {
    const existingIdx = next.findIndex(s => s.name.trim() === key.trim())
    if (existingIdx >= 0) {
      next[existingIdx] = {
        ...next[existingIdx],
        rows: [...next[existingIdx].rows, ...bySection.get(key)!],
      }
    } else {
      next.push({ name: key, rows: bySection.get(key)! })
    }
  }

  return ensureNonEmpty(next)
}

export function NewRecipeModal({ open, onClose, recipe, onSaved }: Props) {
  const editing = !!recipe
  const [seededFor, setSeededFor] = useState<string | null>(null)
  const [name, setName] = useState(recipe?.name ?? '')
  const [instructions, setInstructions] = useState(recipe?.instructions ?? '')
  const [servings, setServings] = useState(recipe?.servings ?? DEFAULT_SERVINGS)
  const [sections, setSections] = useState<Section[]>(() => sectionsFromRecipe(recipe))
  const [error, setError] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseProgress, setParseProgress] = useState<{ current: number; total: number } | null>(null)
  const [urlValue, setUrlValue] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const parseRecipe = useParseRecipe()
  const importUrl = useImportRecipeUrl()
  const addRecipe = useAddRecipe()
  const updateRecipe = useUpdateRecipe()
  const fileRef = useRef<HTMLInputElement>(null)

  const seedKey = open ? (recipe?.id ?? 'new') : null
  if (seedKey !== seededFor) {
    setSeededFor(seedKey)
    setName(recipe?.name ?? '')
    setInstructions(recipe?.instructions ?? '')
    setServings(recipe?.servings ?? DEFAULT_SERVINGS)
    setSections(sectionsFromRecipe(recipe))
    setError('')
    setParseError(null)
    setParseProgress(null)
    setUrlValue('')
    setUrlError(null)
  }

  function handleClose() {
    onClose()
  }

  function updateRow(sIdx: number, rIdx: number, patch: Partial<Row>) {
    setSections(prev =>
      prev.map((section, si) =>
        si === sIdx
          ? { ...section, rows: section.rows.map((row, ri) => (ri === rIdx ? { ...row, ...patch } : row)) }
          : section,
      ),
    )
  }

  function addRow(sIdx: number) {
    setSections(prev =>
      prev.map((section, si) =>
        si === sIdx ? { ...section, rows: [...section.rows, { ...EMPTY_ROW }] } : section,
      ),
    )
  }

  function removeRow(sIdx: number, rIdx: number) {
    setSections(prev => {
      const next = prev.map((section, si) => {
        if (si !== sIdx) return section
        const rows = section.rows.filter((_, ri) => ri !== rIdx)
        return { ...section, rows }
      })
      // If a section is now empty AND it's not the only section, drop it.
      const filtered = next.filter((s, i) => s.rows.length > 0 || next.length === 1 || (i === 0 && next.length === 1))
      if (filtered.length === 0) return DEFAULT_SECTIONS
      return ensureNonEmpty(filtered)
    })
  }

  function addSection() {
    setSections(prev => [...prev, { name: '', rows: [{ ...EMPTY_ROW }] }])
  }

  function updateSectionName(sIdx: number, value: string) {
    setSections(prev => prev.map((section, si) => (si === sIdx ? { ...section, name: value } : section)))
  }

  function removeSection(sIdx: number) {
    setSections(prev => {
      const filtered = prev.filter((_, i) => i !== sIdx)
      if (filtered.length === 0) return DEFAULT_SECTIONS
      return filtered
    })
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (fileRef.current) fileRef.current.value = ''
    if (files.length === 0) return

    setParseError(null)
    setParseProgress({ current: 0, total: files.length })

    try {
      const all: ParsedIngredient[] = []
      const instructionsBuf: string[] = []
      for (let i = 0; i < files.length; i++) {
        setParseProgress({ current: i + 1, total: files.length })
        const dataUrl = await fileToCompressedDataUrl(files[i])
        const parsed = await parseRecipe.mutateAsync(dataUrl)
        all.push(...parsed.ingredients)
        if (parsed.instructions) instructionsBuf.push(parsed.instructions)
      }

      if (all.length === 0 && instructionsBuf.length === 0) {
        setParseError('Inget recept hittades i bilden.')
        return
      }

      if (all.length > 0) {
        setSections(prev => applyParsedToSections(prev, all))
      }

      if (instructionsBuf.length > 0) {
        setInstructions(prev => {
          const current = prev.trim()
          const joined = instructionsBuf.join('\n\n')
          if (!current) return joined
          return `${current}\n\n${joined}`
        })
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Kunde inte tolka receptet')
    } finally {
      setParseProgress(null)
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
      if (!name.trim()) setName(imported.name)
      if (imported.servings) setServings(imported.servings)

      if (imported.ingredients.length > 0) {
        const parsedRows: ParsedIngredient[] = imported.ingredients.map(line => {
          const parsed = parseIngredientLine(line)
          return {
            name: parsed.name,
            quantity: parsed.quantity ?? null,
            category: 'Övrigt',
            section: null,
          }
        })
        setSections(prev => applyParsedToSections(prev, parsedRows))
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
    const ingredients: RecipeIngredientInput[] = []
    for (const section of sections) {
      const sectionName = section.name.trim() || null
      for (const row of section.rows) {
        const n = row.name.trim()
        if (!n) continue
        ingredients.push({
          name: n,
          quantity: row.quantity.trim() || null,
          section: sectionName,
        })
      }
    }
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

  const ingredientCount = sections.reduce(
    (sum, s) => sum + s.rows.filter(r => r.name.trim().length > 0).length,
    0,
  )
  const parsing = parseRecipe.isPending
  const saving = addRecipe.isPending || updateRecipe.isPending
  const importing = importUrl.isPending
  const hasMultipleSections = sections.length > 1 || sections.some(s => s.name.trim().length > 0)

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
            {parsing
              ? parseProgress && parseProgress.total > 1
                ? `Läser recept ${parseProgress.current}/${parseProgress.total}…`
                : 'Läser receptet…'
              : 'Fyll i från foto'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {parsing && (
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            <Spinner className="h-4 w-4" />
            {parseProgress && parseProgress.total > 1
              ? `Läser ingredienserna (${parseProgress.current}/${parseProgress.total})…`
              : 'Läser ingredienserna…'}
          </div>
        )}
        {parseError && (
          <p className="text-xs text-red-500 bg-red-50 rounded-lg px-2.5 py-1.5">{parseError}</p>
        )}

        <div className="max-h-[40vh] overflow-y-auto -mx-1 px-1 flex flex-col gap-3">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="flex flex-col gap-1.5">
              {(hasMultipleSections || section.name.trim().length > 0) && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={section.name}
                    onChange={e => updateSectionName(sIdx, e.target.value)}
                    placeholder={sIdx === 0 ? 'Huvudingredienser (valfritt)' : `Sektion ${sIdx + 1}`}
                    className="flex-1 min-w-0 text-xs font-semibold text-gray-700 uppercase tracking-wide bg-transparent border-b border-dashed border-gray-200 focus:border-emerald-300 focus:outline-none py-1 placeholder:text-gray-400 placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
                  />
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSection(sIdx)}
                      aria-label="Ta bort sektion"
                      className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {section.rows.map((row, rIdx) => (
                <div key={rIdx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.name}
                    onChange={e => updateRow(sIdx, rIdx, { name: e.target.value })}
                    placeholder="Ingrediens"
                    className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                  />
                  <input
                    type="text"
                    value={row.quantity}
                    onChange={e => updateRow(sIdx, rIdx, { quantity: e.target.value })}
                    placeholder="Antal"
                    className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(sIdx, rIdx)}
                    aria-label="Ta bort ingrediens"
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => addRow(sIdx)}
                className="self-start text-xs font-medium text-emerald-600 hover:text-emerald-700 mt-0.5"
              >
                + Lägg till ingrediens
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addSection}
          className="self-start text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          + Lägg till sektion
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
