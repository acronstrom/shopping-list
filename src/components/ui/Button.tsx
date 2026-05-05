import { type ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
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
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-green-600 text-white hover:bg-green-700 active:bg-green-800': variant === 'primary',
          'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 active:bg-gray-100': variant === 'secondary',
          'text-gray-600 hover:bg-gray-100 active:bg-gray-200': variant === 'ghost',
          'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100': variant === 'danger',
          'px-3 py-1.5 text-sm': size === 'sm',
          'px-4 py-2.5 text-sm': size === 'md',
          'px-5 py-3 text-base': size === 'lg',
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
