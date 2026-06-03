import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Leaf } from '@/lib/icons'
import { clsx } from 'clsx'

export function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Kontrollera din e-post för att bekräfta ditt konto.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      {/* Hero */}
      <div className="relative mx-4 mt-4 rounded-card overflow-hidden h-[300px] bg-gradient-to-br from-clay to-clay-deep">
        <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-transparent to-ink/45" />
        <div className="absolute left-[22px] top-5 flex items-center gap-2.5 text-white">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-white/15 grid place-items-center">
            <Leaf size={18} />
          </span>
          <span className="font-semibold text-[16px] tracking-[-0.01em]">Inköpslista</span>
        </div>
        <div className="absolute left-[22px] right-[22px] bottom-5 text-white">
          <div className="font-serif text-[34px] font-medium leading-[1.02] tracking-[-0.02em]">
            Vad blir det<br />för mat?
          </div>
        </div>
      </div>

      <div className="px-6 pt-5">
        <p className="text-[15px] text-ink-3 leading-relaxed mb-5">
          En delad inköpslista och receptbok för hela hushållet.
        </p>

        <div className="flex gap-0.5 rounded-full bg-surface-2 border border-hair p-[3px] mb-5">
          {(['signin', 'signup'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(''); setMessage('') }}
              className={clsx(
                'flex-1 py-2 text-[13.5px] font-medium rounded-full transition-all',
                mode === m ? 'bg-surface text-ink shadow-[0_1px_2px_oklch(0.4_0.02_60/0.12)]' : 'text-ink-3'
              )}
            >
              {m === 'signin' ? 'Logga in' : 'Skapa konto'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="E-post"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="du@exempel.se"
            required
            autoComplete="email"
          />
          <Input
            label="Lösenord"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />

          {error && <p className="text-sm text-rose bg-rose-tint rounded-[12px] px-3 py-2">{error}</p>}
          {message && <p className="text-sm text-sage bg-sage-tint rounded-[12px] px-3 py-2">{message}</p>}

          <Button type="submit" variant="clay" loading={loading} size="lg" className="w-full mt-1">
            {mode === 'signin' ? 'Logga in' : 'Skapa konto'}
          </Button>
        </form>
      </div>
    </div>
  )
}
