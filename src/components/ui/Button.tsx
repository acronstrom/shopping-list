import { type ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'clay' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-ink text-paper hover:opacity-90 active:opacity-80': variant === 'primary',
          'bg-clay text-white shadow-[0_8px_20px_-10px_var(--color-clay)] hover:bg-clay-deep active:bg-clay-deep': variant === 'clay',
          'bg-surface text-ink border border-hair shadow-card hover:bg-surface-2': variant === 'secondary',
          'text-ink-2 hover:bg-surface-2 active:bg-surface-2': variant === 'ghost',
          'bg-rose-tint text-rose hover:opacity-90 active:opacity-80': variant === 'danger',
          'px-3.5 py-2 text-sm rounded-[11px]': size === 'sm',
          'px-4 py-2.5 text-sm rounded-[13px]': size === 'md',
          'px-5 py-3.5 text-base rounded-[14px]': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
