import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { clsx } from 'clsx'

interface PageHeaderProps {
  /** Small text above the title (eyebrow / context line). */
  eyebrow?: string
  title: string
  /** Optional subtitle below the title. */
  sub?: string
  /** Trailing element, typically a HeaderIconButton or text action. */
  right?: ReactNode
}

/* Large-title navigation header (kit.jsx `Nav`). Scrolls with content. */
export function PageHeader({ eyebrow, title, sub, right }: PageHeaderProps) {
  return (
    <div className="px-[22px] pt-2 pb-1.5">
      {(eyebrow || right) && (
        <div className="flex items-center justify-between gap-3 min-h-[34px]">
          <span className="text-[13px] font-medium text-ink-3 truncate">{eyebrow}</span>
          {right}
        </div>
      )}
      <h1 className="font-serif font-medium text-[32px] leading-[1.05] tracking-[-0.02em] text-ink mt-1.5">
        {title}
      </h1>
      {sub && <p className="text-sm text-ink-3 mt-0.5">{sub}</p>}
    </div>
  )
}

interface HeaderIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Filled/tinted surface variant (card with hairline + shadow). */
  tint?: boolean
}

/* Round 38px chrome icon button used in the header trailing slot. */
export function HeaderIconButton({ tint = true, className, children, ...props }: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      className={clsx(
        'w-[38px] h-[38px] rounded-full grid place-items-center text-ink flex-none transition-colors',
        tint ? 'bg-surface border border-hair shadow-card' : 'hover:bg-surface-2',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
