import { useMemo, useState } from 'react'
import { useAddHouseholdCategory, useHouseholdCategories, useSetStoreCategoryOrder, useStoreCategoryOrders } from '@/hooks/useCategories'

interface Props {
  storeId: string
}

function move<T>(arr: T[], from: number, to: number) {
  const copy = [...arr]
  const [item] = copy.splice(from, 1)
  copy.splice(to, 0, item)
  return copy
}

export function StoreCategoryOrderEditor({ storeId }: Props) {
  const { data: householdCategories = [], isLoading: loadingCats } = useHouseholdCategories()
  const { data: storeOrders = [], isLoading: loadingOrder } = useStoreCategoryOrders(storeId)
  const setOrder = useSetStoreCategoryOrder()
  const addCategory = useAddHouseholdCategory()
  const [newCategory, setNewCategory] = useState('')
  const [error, setError] = useState('')

  const orderedCategoryNames = useMemo(() => {
    const names = householdCategories.map(c => c.name)
    if (names.length === 0) return []

    const byName = new Map(names.map(n => [n, true]))
    const existing = storeOrders
      .map(o => o.category_name)
      .filter(n => byName.has(n))

    const missing = names.filter(n => !existing.includes(n))
    return [...existing, ...missing]
  }, [householdCategories, storeOrders])

  const isBusy = loadingCats || loadingOrder || setOrder.isPending || addCategory.isPending

  if (loadingCats) {
    return <p className="text-sm text-gray-400 py-4 text-center">Laddar kategorier…</p>
  }

  if (householdCategories.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-4 text-center">
        Inga kategorier definierade än. Lägg till kategorier i inställningar först.
      </p>
    )
  }

  async function persist(nextNames: string[]) {
    await setOrder.mutateAsync({ storeId, orderedCategoryNames: nextNames })
  }

  async function handleAdd() {
    setError('')
    const trimmed = newCategory.trim()
    if (!trimmed) return
    try {
      // Add globally available category for the household.
      // Store ordering will pick it up automatically (as "missing") until you move it.
      await addCategory.mutateAsync({ name: trimmed, sortOrder: orderedCategoryNames.length })
      setNewCategory('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Det gick inte att lägga till kategori')
    }
  }

  return (
    <div>
      <div className="divide-y divide-gray-50">
      {orderedCategoryNames.map((name, idx) => (
        <div key={name} className="flex items-center justify-between py-2.5 px-1 gap-2">
          <span className="text-sm text-gray-700">{name}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isBusy || idx === 0}
              onClick={() => persist(move(orderedCategoryNames, idx, idx - 1))}
              className="px-2 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              aria-label="Flytta upp"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={isBusy || idx === orderedCategoryNames.length - 1}
              onClick={() => persist(move(orderedCategoryNames, idx, idx + 1))}
              className="px-2 py-1 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              aria-label="Flytta ner"
            >
              ↓
            </button>
          </div>
        </div>
      ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
          placeholder="Ny kategori…"
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={isBusy || !newCategory.trim()}
          className="px-3 py-2 rounded-xl text-sm font-medium bg-green-600 hover:bg-green-700 active:bg-green-800 text-white transition-colors disabled:opacity-40"
        >
          Lägg till
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </div>
  )
}

