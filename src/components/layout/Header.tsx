import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import { NAV_ITEMS } from '@/lib/constants'

interface HeaderProps {
  title: string
  action?: { label: string; onClick: () => void }
}

export function Header({ title, action }: HeaderProps) {
  const { householdId } = useAuth()
  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 px-4 py-3 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <BrandMark />
          <h1 className="text-lg font-semibold text-gray-900 tracking-tight truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          {action && householdId && (
            <button
              onClick={action.onClick}
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors whitespace-nowrap"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

function BrandMark() {
  return (
    <div className="relative w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_6px_16px_-6px_rgba(16,185,129,0.55),inset_0_1px_0_rgba(255,255,255,0.45)]">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-2xl bg-gradient-to-b from-white/25 to-transparent"
        aria-hidden
      />
      <svg
        className="relative w-[22px] h-[22px] text-white"
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
