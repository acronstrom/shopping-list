import { useState, type FormEvent, useRef } from 'react'
import { useAddGrocery } from '@/hooks/useGroceries'

export function AddGroceryForm() {
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const addGrocery = useAddGrocery()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setName('')
    setQuantity('')
    await addGrocery.mutateAsync({ name: trimmed, quantity })
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Add an item…"
          className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors"
          autoComplete="off"
        />
        <input
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="Qty"
          className="w-20 rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-colors"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={!name.trim() || addGrocery.isPending}
          className="w-12 h-12 flex items-center justify-center bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-xl transition-colors disabled:opacity-40"
          aria-label="Add item"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    </form>
  )
}
