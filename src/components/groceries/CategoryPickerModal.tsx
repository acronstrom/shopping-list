import { useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Dot } from '@/components/ui/Dot'
import { Check } from '@/lib/icons'
import { useHouseholdCategories, useHouseholdSubcategories } from '@/hooks/useCategories'
import { clsx } from 'clsx'

interface Selection {
  category: string
  subcategory: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  itemName: string
  currentCategory: string
  currentSubcategory?: string | null
  onSelect: (selection: Selection) => void
}

export function CategoryPickerModal({
  open,
  onClose,
  itemName,
  currentCategory,
  currentSubcategory = null,
  onSelect,
}: Props) {
  const { data: categories = [] } = useHouseholdCategories()
  const { data: subcategories = [] } = useHouseholdSubcategories()

  const departments = useMemo(() => {
    const list = categories.map(c => c.name)
    if (!list.includes('Övrigt')) list.push('Övrigt')
    return list
  }, [categories])

  const subsByParent = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const s of subcategories) {
      const arr = map.get(s.parent_category) ?? []
      arr.push(s.name)
      map.set(s.parent_category, arr)
    }
    return map
  }, [subcategories])

  function handlePick(category: string, subcategory: string | null) {
    const unchanged = category === currentCategory && (subcategory ?? null) === (currentSubcategory ?? null)
    if (!unchanged) onSelect({ category, subcategory })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Välj kategori">
      <p className="text-[13px] text-ink-3 -mt-2 mb-4">
        {itemName} – valet sparas och används för liknande varor framöver.
      </p>
      <div className="flex flex-col gap-1">
        {departments.map(dept => {
          const subs = subsByParent.get(dept) ?? []
          const deptSelected = dept === currentCategory && !currentSubcategory
          return (
            <div key={dept} className="flex flex-col gap-1">
              <button
                onClick={() => handlePick(dept, null)}
                className={clsx(
                  'flex items-center gap-3 rounded-[12px] px-3 py-3 text-left text-[16px] transition-colors',
                  deptSelected ? 'bg-clay-tint text-ink' : 'text-ink-2 hover:bg-surface-2',
                )}
              >
                <Dot category={dept} />
                <span className="flex-1">{dept}</span>
                {deptSelected && <Check size={16} className="text-clay-deep" />}
              </button>
              {subs.map(sub => {
                const subSelected = dept === currentCategory && sub === currentSubcategory
                return (
                  <button
                    key={sub}
                    onClick={() => handlePick(dept, sub)}
                    className={clsx(
                      'flex items-center gap-3 rounded-[12px] pl-9 pr-3 py-2.5 text-left text-[15px] transition-colors',
                      subSelected ? 'bg-clay-tint text-ink' : 'text-ink-3 hover:bg-surface-2',
                    )}
                  >
                    <Dot category={dept} />
                    <span className="flex-1">{sub}</span>
                    {subSelected && <Check size={15} className="text-clay-deep" />}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
