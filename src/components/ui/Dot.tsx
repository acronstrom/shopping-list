import { clsx } from 'clsx'
import { categoryDotClass } from '@/lib/constants'

/* Small category dot used in section headers and history rows.
   Pass either an explicit bg-utility via `className`, or a category name. */
export function Dot({ category, className }: { category?: string; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-block w-[7px] h-[7px] rounded-full flex-none',
        category ? categoryDotClass(category) : className
      )}
    />
  )
}
