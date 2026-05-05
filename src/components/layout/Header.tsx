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
    <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-base">🛒</span>
          </div>
          <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
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
                      ? 'bg-green-50 text-green-700'
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
              className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors whitespace-nowrap"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
