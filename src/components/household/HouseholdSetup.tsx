import { useState, type FormEvent } from 'react'
import { useCreateHousehold, useJoinHousehold } from '@/hooks/useHousehold'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { supabase } from '@/lib/supabase'

export function HouseholdSetup() {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const createHousehold = useCreateHousehold()
  const joinHousehold = useJoinHousehold()

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createHousehold.mutateAsync(name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create household')
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await joinHousehold.mutateAsync()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pending invite found for your email')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">🏠</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set up your household</h1>
          <p className="text-sm text-gray-500 mt-1">Create a new household or join an existing one</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {mode === 'choose' && (
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setMode('create')} className="w-full">
                Create a new household
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setMode('join')} className="w-full">
                Join with an invite
              </Button>
              <button
                onClick={handleSignOut}
                className="text-sm text-gray-400 hover:text-gray-600 mt-2 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => { setMode('choose'); setError('') }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 -mb-1"
              >
                ← Back
              </button>
              <Input
                label="Household name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Smith Family"
                required
              />
              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <Button type="submit" loading={createHousehold.isPending} size="lg" className="w-full">
                Create household
              </Button>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => { setMode('choose'); setError('') }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 -mb-1"
              >
                ← Back
              </button>
              <p className="text-sm text-gray-600">
                Someone must invite you by email first. We'll look for a pending invite for your account.
              </p>
              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <Button type="submit" loading={joinHousehold.isPending} size="lg" className="w-full">
                Find my invite
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
