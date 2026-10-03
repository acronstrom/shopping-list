import { Cart, Calendar, Book, Store, More, type IconProps } from '@/lib/icons'

export interface TabDef {
  to: string
  label: string
  Icon: (p: IconProps) => React.ReactElement
  isActive: (path: string) => boolean
}

export const TABS: TabDef[] = [
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
