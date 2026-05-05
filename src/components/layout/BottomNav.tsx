import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'

const navItems = [
  { to: '/', label: 'List', icon: '🛒' },
  { to: '/stores', label: 'Stores', icon: '🏪' },
  { to: '/history', label: 'History', icon: '📋' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-10 safe-area-bottom">
      <div className="max-w-2xl mx-auto flex">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors',
                isActive ? 'text-green-600' : 'text-gray-400 hover:text-gray-600'
              )
            }
          >
            <span className="text-xl leading-none">{icon}</span>
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
