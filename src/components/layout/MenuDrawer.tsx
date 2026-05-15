import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { NAV_ITEMS } from '@/lib/constants'

interface Props {
  open: boolean
  onClose: () => void
}

export function MenuDrawer({ open, onClose }: Props) {
  const location = useLocation()

  // Close when route changes (i.e. after the user picks an item).
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <div className={clsx('fixed inset-0 z-40', !open && 'pointer-events-none')} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={clsx(
          'absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />
      <aside
        className={clsx(
          'absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white shadow-2xl flex flex-col transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Meny"
      >
        <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandMark />
            <span className="font-semibold text-gray-900 tracking-tight truncate">Inköpslista</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Stäng meny"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-700 hover:bg-gray-50'
                )
              }
            >
              <span aria-hidden className="text-xl leading-none w-6 text-center">{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  )
}

function BrandMark() {
  return (
    <div className="relative w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_6px_16px_-6px_rgba(16,185,129,0.55),inset_0_1px_0_rgba(255,255,255,0.45)]">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-xl bg-gradient-to-b from-white/25 to-transparent"
        aria-hidden
      />
      <svg
        className="relative w-5 h-5 text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 3.5h2l2.5 11.3a1.8 1.8 0 0 0 1.76 1.4h8.96a1.8 1.8 0 0 0 1.75-1.39L21.5 8H6.3" />
        <path d="M9.8 11.2l1.7 1.7 3.5-3.7" />
        <circle cx="9.5" cy="20" r="1.2" />
        <circle cx="17.5" cy="20" r="1.2" />
      </svg>
    </div>
  )
}
