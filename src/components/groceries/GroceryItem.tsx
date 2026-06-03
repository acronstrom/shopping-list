import { useState, useRef } from 'react'
import { useToggleGrocery, useDeleteGrocery } from '@/hooks/useGroceries'
import { useUI } from '@/contexts/UIContext'
import { Check, Trash } from '@/lib/icons'
import { playCompleteSound, playUncheckSound } from '@/lib/feedback'
import { capitalizeFirst } from '@/lib/text'
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

const CONFETTI_COLORS = ['#b5673c', '#d08a5a', '#e0a472', '#7e9479', '#cf9f5e']

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
        'group relative flex items-center gap-3 px-4 transition-colors duration-300',
        isShopping ? 'py-4 cursor-pointer active:bg-clay-tint/60 select-none' : 'py-[13px]',
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
            'relative rounded-full border-[1.8px] flex items-center justify-center transition-all duration-200',
            isShopping ? 'w-[30px] h-[30px]' : 'w-6 h-6',
            item.is_checked
              ? 'bg-clay border-clay text-white'
              : 'bg-surface border-hair hover:border-clay-line hover:bg-clay-tint/50'
          )}
          aria-label={item.is_checked ? 'Avmarkera' : 'Markera'}
          tabIndex={isShopping ? -1 : 0}
        >
          {item.is_checked && (
            <Check
              key={celebrate}
              size={isShopping ? 18 : 15}
              className={clsx(celebrate > 0 && 'animate-check-pop')}
            />
          )}
        </button>

        {celebrate > 0 && item.is_checked && (
          <>
            <span
              key={`burst-${celebrate}`}
              className="pointer-events-none absolute inset-0 rounded-full bg-clay/40 animate-burst"
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
        <div
          className={clsx(
            'text-[16px] tracking-[-0.01em] transition-colors duration-300',
            isShopping && 'text-[18px]',
            item.is_checked ? 'text-ink-4 line-through decoration-ink-4' : 'text-ink'
          )}
        >
          {capitalizeFirst(item.name)}
        </div>
        {item.note && (
          <p className={clsx('text-[13px] mt-0.5 truncate', item.is_checked ? 'text-ink-4' : 'text-clay-deep')}>
            {item.note}
          </p>
        )}
        {!isShopping && (
          <button
            onClick={e => {
              e.stopPropagation()
              setShowDate(v => !v)
            }}
            className="text-[11px] text-ink-4 hover:text-ink-3 transition-colors mt-0.5"
            aria-label="Visa/dölj tidpunkt"
          >
            {showDate ? formatAddedAt(item.created_at) : '···'}
          </button>
        )}
        {showAisle && aisleNumber !== undefined && (
          <span className="text-[11px] text-ink-4 ml-2">Gång {aisleNumber}</span>
        )}
      </div>

      {item.quantity && (
        <span
          className={clsx(
            'text-[15px] tabular-nums flex-none',
            isShopping && 'text-[16px]',
            item.is_checked ? 'text-ink-4' : 'text-ink-3'
          )}
        >
          {item.quantity}
        </span>
      )}

      {!isShopping && (
        <button
          onClick={e => {
            e.stopPropagation()
            deleteItem.mutate(item.id)
          }}
          className="flex-shrink-0 p-1.5 text-ink-4 hover:text-rose md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all rounded-lg hover:bg-rose-tint"
          aria-label="Ta bort vara"
        >
          <Trash size={16} />
        </button>
      )}
    </div>
  )
}
