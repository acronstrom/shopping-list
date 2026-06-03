import { type InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={clsx(
            'w-full rounded-[14px] border border-hair bg-surface px-4 py-3 text-[16px] text-ink placeholder:text-ink-4 transition-colors',
            'focus:outline-none focus:border-clay-line focus:ring-2 focus:ring-clay/30',
            'disabled:opacity-50 disabled:bg-surface-2',
            error && 'border-rose focus:border-rose focus:ring-rose/30',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
