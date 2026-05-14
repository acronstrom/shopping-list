import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { useAddGroceriesBulk } from '@/hooks/useGroceries'
import type { ParsedIngredient } from '@/hooks/useParseRecipe'

interface RecipeImportModalProps {
  open: boolean
  loading: boolean
  error: string | null
  ingredients: ParsedIngredient[]
  onClose: () => void
  onRetry: () => void
}

interface Row extends ParsedIngredient {
  selected: boolean
}

export function RecipeImportModal({
  open,
  loading,
  error,
  ingredients,
  onClose,
  onRetry,
}: RecipeImportModalProps) {
  const [rows, setRows] = useState<Row[]>([])
  const [seededFrom, setSeededFrom] = useState<ParsedIngredient[] | null>(null)
  const addBulk = useAddGroceriesBulk()

  if (!loading && ingredients !== seededFrom) {
    setSeededFrom(ingredients)
    setRows(ingredients.map(i => ({ ...i, selected: true })))
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  async function handleAdd() {
    const toAdd = rows
      .filter(r => r.selected && r.name.trim().length > 0)
      .map(r => ({ name: r.name, quantity: r.quantity, category: r.category }))
    if (toAdd.length === 0) return
    await addBulk.mutateAsync(toAdd)
    onClose()
  }

  const selectedCount = rows.filter(r => r.selected && r.name.trim().length > 0).length
  const isEmpty = !loading && !error && ingredients.length === 0

  return (
    <Modal open={open} onClose={onClose} title="Från recept">
      {loading ? (
        <div className="py-10 flex flex-col items-center gap-3">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-gray-600">Läser receptet…</p>
        </div>
      ) : error ? (
        <div className="py-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-gray-700">{error}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Avbryt</Button>
            <Button onClick={onRetry}>Försök igen</Button>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="py-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-gray-700">Inga ingredienser hittades i bilden.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Avbryt</Button>
            <Button onClick={onRetry}>Försök igen</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">
            Granska och justera innan du lägger till. Bocka ur det du inte behöver.
          </p>
          <div className="max-h-[55vh] overflow-y-auto -mx-2 px-2 flex flex-col gap-2">
            {rows.map((row, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 rounded-xl border border-gray-200/70 bg-white"
              >
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={e => updateRow(i, { selected: e.target.checked })}
                  className="mt-2.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={row.name}
                      onChange={e => updateRow(i, { name: e.target.value })}
                      className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 border-b border-transparent focus:border-emerald-300 focus:outline-none py-1"
                    />
                    <input
                      type="text"
                      value={row.quantity ?? ''}
                      placeholder="Antal"
                      onChange={e => updateRow(i, { quantity: e.target.value || null })}
                      className="w-20 bg-transparent text-sm text-gray-700 border-b border-transparent focus:border-emerald-300 focus:outline-none py-1"
                    />
                  </div>
                  <CategoryBadge category={row.category} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" onClick={onClose} className="flex-1">Avbryt</Button>
            <Button
              onClick={handleAdd}
              loading={addBulk.isPending}
              disabled={selectedCount === 0}
              className="flex-1"
            >
              Lägg till {selectedCount} {selectedCount === 1 ? 'vara' : 'varor'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
