import { useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Dot } from '@/components/ui/Dot'
import { Check } from '@/lib/icons'
import { useHouseholdCategories } from '@/hooks/useCategories'
import { clsx } from 'clsx'

interface Props {
  open: boolean
  onClose: () => void
  itemName: string
  currentCategory: string
  onSelect: (category: string) => void
}

export function CategoryPickerModal({ open, onClose, itemName, currentCategory, onSelect }: Props) {
  const { data: categories = [] } = useHouseholdCategories()

  const names = useMemo(() => {
    const list = categories.map(c => c.name)
    if (!list.includes('Övrigt')) list.push('Övrigt')
    return list
  }, [categories])

  function handlePick(category: string) {
    if (category !== currentCategory) onSelect(category)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Välj kategori">
      <p className="text-[13px] text-ink-3 -mt-2 mb-4">
        {itemName} – valet sparas och används för liknande varor framöver.
      </p>
      <div className="flex flex-col gap-1">
        {names.map(name => {
          const selected = name === currentCategory
          return (
            <button
              key={name}
              onClick={() => handlePick(name)}
              className={clsx(
                'flex items-center gap-3 rounded-[12px] px-3 py-3 text-left text-[16px] transition-colors',
                selected ? 'bg-clay-tint text-ink' : 'text-ink-2 hover:bg-surface-2',
              )}
            >
              <Dot category={name} />
              <span className="flex-1">{name}</span>
              {selected && <Check size={16} className="text-clay-deep" />}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
