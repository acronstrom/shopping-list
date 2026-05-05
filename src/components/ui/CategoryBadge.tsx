import { clsx } from 'clsx'
import { CATEGORY_COLORS, getCategoryLabelSv } from '@/lib/constants'

export function CategoryBadge({ category }: { category: string }) {
  const colorClass = CATEGORY_COLORS[category] ?? CATEGORY_COLORS['Other']
  const label = getCategoryLabelSv(category)
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colorClass)}>
      {label}
    </span>
  )
}
