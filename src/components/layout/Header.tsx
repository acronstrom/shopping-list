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
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_6px_16px_-4px_rgba(16,185,129,0.5)]">
            <span className="text-base">🛒</span>
          </div>
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
