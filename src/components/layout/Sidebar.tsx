import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { Leaf } from '@/lib/icons'
import { TABS } from './navTabs'

/* Desktop-only navigation (lg: and up). Mirrors TabBar, which is hidden there. */
export function Sidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="hidden lg:flex flex-col w-60 flex-none sticky top-0 h-dvh border-r border-hair px-4 py-6">
      <div className="flex items-center gap-2.5 px-2 pb-6">
        <span className="w-8 h-8 rounded-[10px] bg-clay grid place-items-center text-white flex-none">
          <Leaf size={18} />
        </span>
        <span className="font-serif text-[20px] font-medium tracking-[-0.01em] text-ink">Inköpslista</span>
      </div>
      <nav className="flex flex-col gap-1">
        {TABS.map(({ to, label, Icon, isActive }) => {
          const active = isActive(pathname)
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-row text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-clay',
                active ? 'bg-clay-tint text-clay-deep' : 'text-ink-2 hover:bg-surface-2'
              )}
            >
              <Icon size={22} sw={active ? 1.9 : 1.7} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
