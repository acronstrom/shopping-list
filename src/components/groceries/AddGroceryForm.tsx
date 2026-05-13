import { useState, type FormEvent, useRef } from 'react'
import { useAddGrocery } from '@/hooks/useGroceries'
import { clsx } from 'clsx'

export function AddGroceryForm() {
  const [name, setName] = useState('')
  const [focused, setFocused] = useState(false)
  const addGrocery = useAddGrocery()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setName('')
    await addGrocery.mutateAsync({ name: trimmed })
    inputRef.current?.focus()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={clsx(
        'bg-white rounded-2xl border p-2 transition-all duration-200',
        focused
          ? 'border-emerald-300 shadow-[0_8px_24px_-12px_rgba(16,185,129,0.35)]'
          : 'border-gray-200/80 shadow-sm'
      )}
    >
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Lägg till en vara…"
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!name.trim() || addGrocery.isPending}
          className={clsx(
            'w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200',
            name.trim()
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_6px_16px_-6px_rgba(16,185,129,0.6)] hover:from-emerald-500 hover:to-emerald-700 active:scale-95'
              : 'bg-gray-100 text-gray-300'
          )}
          aria-label="Lägg till vara"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </form>
  )
}
