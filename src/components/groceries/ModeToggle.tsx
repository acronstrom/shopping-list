import { useUI, type ListMode } from '@/contexts/UIContext'
import { clsx } from 'clsx'

const OPTIONS: { value: ListMode; label: string; icon: string }[] = [
  { value: 'edit', label: 'Redigera', icon: '✏️' },
  { value: 'shopping', label: 'Handla', icon: '🛒' },
]

export function ModeToggle() {
  const { mode, setMode } = useUI()

  return (
    <div
      className="inline-flex rounded-full bg-gray-100/80 p-1 self-start border border-gray-200/60"
      role="tablist"
      aria-label="Läge"
    >
      {OPTIONS.map(opt => {
        const active = mode === opt.value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => setMode(opt.value)}
            className={clsx(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
              active
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <span aria-hidden>{opt.icon}</span>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
