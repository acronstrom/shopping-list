import { useState } from 'react'
import { useToggleGrocery, useDeleteGrocery } from '@/hooks/useGroceries'
import { useUI } from '@/contexts/UIContext'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import type { GroceryItem as GroceryItemType } from '@/types'
import { clsx } from 'clsx'

interface Props {
  item: GroceryItemType
  aisleNumber?: number
  showAisle?: boolean
}

function formatAddedAt(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function GroceryItem({ item, aisleNumber, showAisle }: Props) {
  const toggle = useToggleGrocery()
  const deleteItem = useDeleteGrocery()
  const { mode } = useUI()
  const [showDate, setShowDate] = useState(false)
  const isShopping = mode === 'shopping'

  const handleToggle = () => toggle.mutate({ id: item.id, is_checked: !item.is_checked })

  return (
    <div
      onClick={isShopping ? handleToggle : undefined}
      role={isShopping ? 'button' : undefined}
      aria-pressed={isShopping ? item.is_checked : undefined}
      tabIndex={isShopping ? 0 : undefined}
      onKeyDown={
        isShopping
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleToggle()
              }
            }
          : undefined
      }
      className={clsx(
        'flex items-center gap-3 px-4 group transition-opacity',
        isShopping ? 'py-4 cursor-pointer active:bg-gray-50 select-none' : 'py-3',
        item.is_checked && 'opacity-50'
      )}
    >
      <button
        onClick={e => {
          e.stopPropagation()
          handleToggle()
        }}
        className={clsx(
          'flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all',
          isShopping ? 'w-8 h-8' : 'w-6 h-6',
          item.is_checked
            ? 'bg-green-600 border-green-600 text-white'
            : 'border-gray-300 hover:border-green-400'
        )}
        aria-label={item.is_checked ? 'Avmarkera' : 'Markera'}
        tabIndex={isShopping ? -1 : 0}
      >
        {item.is_checked && (
          <svg className={clsx(isShopping ? 'w-5 h-5' : 'w-3.5 h-3.5')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('text-sm font-medium text-gray-900', item.is_checked && 'line-through text-gray-400')}>
            {item.name}
          </span>
          {item.quantity && (
            <span className="text-xs text-gray-400">{item.quantity}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <CategoryBadge category={item.category} />
          {showAisle && aisleNumber !== undefined && (
            <span className="text-xs text-gray-400">Gång {aisleNumber}</span>
          )}
          {!isShopping && (
            <button
              onClick={e => {
                e.stopPropagation()
                setShowDate(v => !v)
              }}
              className="text-xs text-gray-300 hover:text-gray-400 transition-colors"
              aria-label="Visa/dölj tidpunkt"
            >
              {showDate ? formatAddedAt(item.created_at) : '···'}
            </button>
          )}
        </div>
      </div>

      {!isShopping && (
        <button
          onClick={e => {
            e.stopPropagation()
            deleteItem.mutate(item.id)
          }}
          className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-400 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all rounded-lg hover:bg-red-50"
          aria-label="Ta bort vara"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
