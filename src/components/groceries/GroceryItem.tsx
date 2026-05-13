import { useState, useRef } from 'react'
import { useToggleGrocery, useDeleteGrocery } from '@/hooks/useGroceries'
import { useUI } from '@/contexts/UIContext'
import { CategoryBadge } from '@/components/ui/CategoryBadge'
import { playCompleteSound, playUncheckSound } from '@/lib/feedback'
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

const CONFETTI_COLORS = ['#10b981', '#34d399', '#fbbf24', '#60a5fa', '#f472b6']

export function GroceryItem({ item, aisleNumber, showAisle }: Props) {
  const toggle = useToggleGrocery()
  const deleteItem = useDeleteGrocery()
  const { mode } = useUI()
  const [showDate, setShowDate] = useState(false)
  const [celebrate, setCelebrate] = useState(0)
  const animatingRef = useRef(false)
  const isShopping = mode === 'shopping'

  const handleToggle = () => {
    const next = !item.is_checked
    if (next) {
      playCompleteSound()
      if (!animatingRef.current) {
        animatingRef.current = true
        setCelebrate(c => c + 1)
        window.setTimeout(() => { animatingRef.current = false }, 700)
      }
    } else {
      playUncheckSound()
    }
    toggle.mutate({ id: item.id, is_checked: next })
  }

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
        'relative flex items-center gap-3 px-4 group transition-all duration-300',
        isShopping ? 'py-4 cursor-pointer active:bg-emerald-50/60 select-none' : 'py-3',
        item.is_checked && 'opacity-60',
        celebrate > 0 && item.is_checked && 'animate-row-complete'
      )}
    >
      <div className="relative flex-shrink-0">
        <button
          onClick={e => {
            e.stopPropagation()
            handleToggle()
          }}
          className={clsx(
            'relative rounded-full border-2 flex items-center justify-center transition-all duration-200',
            isShopping ? 'w-9 h-9' : 'w-6 h-6',
            item.is_checked
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_12px_-2px_rgba(16,185,129,0.45)]'
              : 'bg-white border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
          )}
          aria-label={item.is_checked ? 'Avmarkera' : 'Markera'}
          tabIndex={isShopping ? -1 : 0}
        >
          {item.is_checked && (
            <svg
              key={celebrate}
              className={clsx(
                isShopping ? 'w-5 h-5' : 'w-3.5 h-3.5',
                celebrate > 0 && 'animate-check-pop'
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                className={clsx(celebrate > 0 && 'animate-check-draw')}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>

        {celebrate > 0 && item.is_checked && (
          <>
            <span
              key={`burst-${celebrate}`}
              className="absolute inset-0 rounded-full bg-emerald-400/40 animate-burst"
              aria-hidden
            />
            <span
              key={`confetti-${celebrate}`}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              {Array.from({ length: 6 }).map((_, i) => {
                const angle = (i / 6) * Math.PI * 2
                const cx = Math.cos(angle) * 22
                const cy = Math.sin(angle) * 22
                return (
                  <span
                    key={i}
                    className="confetti-piece"
                    style={{
                      backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                      ['--cx' as string]: `${cx}px`,
                      ['--cy' as string]: `${cy}px`,
                      ['--cr' as string]: `${(i % 2 === 0 ? 1 : -1) * 240}deg`,
                      animationDelay: `${i * 12}ms`,
                    }}
                  />
                )
              })}
            </span>
          </>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={clsx(
              'text-sm font-medium text-gray-900 transition-all duration-300',
              item.is_checked && 'line-through text-gray-400'
            )}
          >
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
          className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all rounded-lg hover:bg-red-50"
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
