import { useState, type FormEvent } from 'react'
import { useCreateHousehold, useJoinHousehold } from '@/hooks/useHousehold'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Users } from '@/lib/icons'
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
      setError(err instanceof Error ? err.message : 'Det gick inte att skapa hushållet')
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await joinHousehold.mutateAsync()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ingen väntande inbjudan hittades för din e-post')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-clay rounded-card mb-4 shadow-card text-white">
            <Users size={30} />
          </div>
          <h1 className="font-serif text-[26px] font-medium tracking-[-0.02em] text-ink">Konfigurera ditt hushåll</h1>
          <p className="text-sm text-ink-3 mt-1">Skapa ett nytt hushåll eller gå med i ett befintligt</p>
        </div>

        <div className="bg-surface rounded-card shadow-card border border-hair p-6">
          {mode === 'choose' && (
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => setMode('create')} className="w-full">
                Skapa ett nytt hushåll
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setMode('join')} className="w-full">
                Gå med via inbjudan
              </Button>
              <button
                onClick={handleSignOut}
                className="text-sm text-ink-4 hover:text-ink-2 mt-2 transition-colors"
              >
                Logga ut
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => { setMode('choose'); setError('') }}
                className="flex items-center gap-1 text-sm text-ink-3 hover:text-ink -mb-1"
              >
                ← Tillbaka
              </button>
              <Input
                label="Hushållsnamn"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="t.ex. Familjen Svensson"
                required
              />
              {error && <p className="text-sm text-rose bg-rose-tint rounded-[12px] px-3 py-2">{error}</p>}
              <Button type="submit" loading={createHousehold.isPending} size="lg" className="w-full">
                Skapa hushåll
              </Button>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => { setMode('choose'); setError('') }}
                className="flex items-center gap-1 text-sm text-ink-3 hover:text-ink -mb-1"
              >
                ← Tillbaka
              </button>
              <p className="text-sm text-ink-2">
                Någon måste bjuda in dig via e-post först. Vi letar efter en väntande inbjudan till ditt konto.
              </p>
              {error && <p className="text-sm text-rose bg-rose-tint rounded-[12px] px-3 py-2">{error}</p>}
              <Button type="submit" loading={joinHousehold.isPending} size="lg" className="w-full">
                Hitta min inbjudan
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
