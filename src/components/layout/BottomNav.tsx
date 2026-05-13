import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { NAV_ITEMS } from '@/lib/constants'

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 md:hidden pointer-events-none">
      <div className="max-w-2xl mx-auto px-4 pb-3 pt-2 pointer-events-auto">
        <div className="flex bg-white/85 backdrop-blur-xl rounded-2xl shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)] border border-gray-200/70">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors rounded-2xl',
                  isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={clsx(
                      'text-xl leading-none transition-transform',
                      isActive ? 'scale-110' : 'scale-100'
                    )}
                  >
                    {icon}
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
