import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { Cart, Calendar, Book, Store, More, type IconProps } from '@/lib/icons'

interface TabDef {
  to: string
  label: string
  Icon: (p: IconProps) => React.ReactElement
  isActive: (path: string) => boolean
}

const TABS: TabDef[] = [
  { to: '/', label: 'Lista', Icon: Cart, isActive: (p) => p === '/' },
  { to: '/plan', label: 'Veckoplan', Icon: Calendar, isActive: (p) => p.startsWith('/plan') },
  { to: '/recipes', label: 'Recept', Icon: Book, isActive: (p) => p.startsWith('/recipes') },
  { to: '/stores', label: 'Butiker', Icon: Store, isActive: (p) => p.startsWith('/stores') },
  {
    to: '/more',
    label: 'Mer',
    Icon: More,
    isActive: (p) => p.startsWith('/more') || p.startsWith('/history') || p.startsWith('/settings'),
  },
]

export function TabBar() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around bg-paper/85 backdrop-blur-xl border-t border-hair px-3.5 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]">
      {TABS.map(({ to, label, Icon, isActive }) => {
        const active = isActive(pathname)
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'flex-1 flex flex-col items-center gap-1 pt-1.5 text-[10.5px] font-medium tracking-[0.01em] transition-colors',
              active ? 'text-clay' : 'text-ink-3'
            )}
          >
            <Icon size={25} sw={active ? 1.9 : 1.7} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
