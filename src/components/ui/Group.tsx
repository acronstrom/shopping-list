import { type ReactNode } from 'react'
import { clsx } from 'clsx'

/* iOS-style inset grouped-list card (kit.jsx `.group`). Rows are placed as
   direct children; pass `divider` to draw hairlines between them. */
export function Group({
  className,
  divider = false,
  children,
}: {
  className?: string
  divider?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={clsx(
        'rounded-group bg-surface border border-hair shadow-card overflow-hidden',
        divider && 'divide-y divide-hair-2',
        className
      )}
    >
      {children}
    </div>
  )
}

/* Uppercase section header above a group (kit.jsx `.group-h`). */
export function GroupHeader({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-1.5 pb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3',
        className
      )}
    >
      {children}
    </div>
  )
}
