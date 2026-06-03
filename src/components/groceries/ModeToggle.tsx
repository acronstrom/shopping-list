import { useUI } from '@/contexts/UIContext'
import { Cart } from '@/lib/icons'
import { clsx } from 'clsx'

export function ModeToggle() {
  const { mode, setMode } = useUI()

  return (
    <div
      className="inline-flex self-start gap-0.5 rounded-full bg-surface-2 border border-hair p-[3px]"
      role="tablist"
      aria-label="Läge"
    >
      <button
        role="tab"
        aria-selected={mode === 'edit'}
        onClick={() => setMode('edit')}
        className={segClass(mode === 'edit')}
      >
        Redigera
      </button>
      <button
        role="tab"
        aria-selected={mode === 'shopping'}
        onClick={() => setMode('shopping')}
        className={segClass(mode === 'shopping')}
      >
        <Cart size={15} />
        Handla
      </button>
    </div>
  )
}

function segClass(active: boolean) {
  return clsx(
    'inline-flex items-center gap-1.5 px-[15px] py-[7px] rounded-full text-[13.5px] font-medium transition-all',
    active ? 'bg-surface text-ink shadow-[0_1px_2px_oklch(0.4_0.02_60/0.12)]' : 'text-ink-3 hover:text-ink-2'
  )
}
