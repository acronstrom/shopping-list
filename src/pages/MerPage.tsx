import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { Group } from '@/components/ui/Group'
import { Clock, Gear, ChevronRight, Leaf } from '@/lib/icons'

interface MerLink {
  to: string
  label: string
  sub: string
  Icon: typeof Clock
}

const LINKS: MerLink[] = [
  { to: '/history', label: 'Inköpshistorik', sub: 'Tidigare köpta varor', Icon: Clock },
  { to: '/settings', label: 'Inställningar', sub: 'Kategorier, hushåll & konto', Icon: Gear },
]

export function MerPage() {
  return (
    <div>
      <PageHeader title="Mer" />
      <div className="px-[18px] pt-2 flex flex-col gap-[18px]">
        <Group divider>
          {LINKS.map(({ to, label, sub, Icon }) => (
            <Link key={to} to={to} className="flex items-center gap-3 px-4 py-3.5">
              <span className="w-10 h-10 rounded-[12px] bg-surface-2 border border-hair grid place-items-center text-ink-2 flex-none">
                <Icon size={21} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[16px] text-ink">{label}</span>
                <span className="block text-[13px] text-ink-3 mt-0.5">{sub}</span>
              </span>
              <ChevronRight size={17} className="text-ink-4 flex-none" />
            </Link>
          ))}
        </Group>

        <div className="flex items-center gap-2.5 px-1.5 pt-2 text-ink-3">
          <span className="w-7 h-7 rounded-[9px] bg-clay grid place-items-center text-white flex-none">
            <Leaf size={16} />
          </span>
          <span className="text-[13px]">Inköpslista — delad lista &amp; receptbok</span>
        </div>
      </div>
    </div>
  )
}
