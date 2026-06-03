import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { Dot } from '@/components/ui/Dot'
import { useAddGroceriesBulk } from '@/hooks/useGroceries'
import type { ParsedIngredient } from '@/hooks/useParseRecipe'

interface RecipeImportModalProps {
  open: boolean
  loading: boolean
  progress?: { current: number; total: number } | null
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
  progress,
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
          <p className="text-sm text-ink-2">
            {progress && progress.total > 1
              ? `Läser recept ${progress.current}/${progress.total}…`
              : 'Läser receptet…'}
          </p>
        </div>
      ) : error ? (
        <div className="py-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-ink-2">{error}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Avbryt</Button>
            <Button variant="clay" onClick={onRetry}>Försök igen</Button>
          </div>
        </div>
      ) : isEmpty ? (
        <div className="py-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-ink-2">Inga ingredienser hittades i bilden.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Avbryt</Button>
            <Button variant="clay" onClick={onRetry}>Försök igen</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-ink-3 mb-3">
            Granska och justera innan du lägger till. Bocka ur det du inte behöver.
          </p>
          <div className="max-h-[55vh] overflow-y-auto -mx-2 px-2 flex flex-col gap-2">
            {rows.map((row, i) => (
              <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-[14px] border border-hair bg-surface">
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={e => updateRow(i, { selected: e.target.checked })}
                  className="mt-2.5 h-4 w-4 rounded accent-clay"
                />
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={row.name}
                      onChange={e => updateRow(i, { name: e.target.value })}
                      className="flex-1 min-w-0 bg-transparent text-sm text-ink border-b border-transparent focus:border-clay-line focus:outline-none py-1"
                    />
                    <input
                      type="text"
                      value={row.quantity ?? ''}
                      placeholder="Antal"
                      onChange={e => updateRow(i, { quantity: e.target.value || null })}
                      className="w-20 bg-transparent text-sm text-ink-2 border-b border-transparent focus:border-clay-line focus:outline-none py-1"
                    />
                  </div>
                  <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
                    <Dot category={row.category} />
                    {row.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="secondary" onClick={onClose} className="flex-1">Avbryt</Button>
            <Button
              variant="clay"
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
