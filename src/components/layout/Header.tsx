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
    <div className="relative w-10 h-10 flex-shrink-0">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-300 via-emerald-500 to-emerald-600 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.55),inset_0_1px_0_rgba(255,255,255,0.45)]" />
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/35 to-transparent opacity-70 mix-blend-screen" />
      <svg
        className="relative w-6 h-6 m-auto inset-0 absolute text-white drop-shadow-[0_1px_1px_rgba(6,78,59,0.45)]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 4h2.2l1.2 2M7.4 8h13.1l-1.7 7a2 2 0 0 1-1.95 1.55H10.1A2 2 0 0 1 8.16 15L6.4 6 5.2 4" />
        <circle cx="10" cy="20" r="1.4" />
        <circle cx="17" cy="20" r="1.4" />
      </svg>
    </div>
  )
}
