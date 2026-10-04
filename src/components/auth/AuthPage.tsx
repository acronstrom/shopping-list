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
    <div className="min-h-dvh bg-paper">
     <div className="mx-auto w-full max-w-md min-h-dvh flex flex-col lg:max-w-none lg:grid lg:grid-cols-2">
      {/* Hero */}
      <div className="relative mx-4 mt-4 rounded-card overflow-hidden h-[200px] bg-gradient-to-br from-clay to-clay-deep lg:m-5 lg:h-auto">
        <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-transparent to-ink/45" />
        <div className="hidden lg:block absolute -right-24 -top-24 w-80 h-80 rounded-full bg-white/10" />
        <div className="hidden lg:block absolute -left-16 top-1/3 w-56 h-56 rounded-full bg-white/[0.06]" />
        <div className="absolute left-[22px] top-5 lg:left-10 lg:top-9 flex items-center gap-2.5 text-white">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-white/15 grid place-items-center">
            <Leaf size={18} />
          </span>
        </div>
        <div className="absolute left-[22px] right-[22px] bottom-5 text-white lg:left-10 lg:right-10 lg:bottom-12">
          <div className="font-serif text-[34px] font-medium leading-[1.02] tracking-[-0.02em] lg:text-[60px]">
            Vad blir det<br />för mat?
          </div>
          <p className="hidden lg:block mt-4 max-w-sm text-[17px] leading-relaxed text-white/85">
            Planera veckan, samla recepten och handla tillsammans – listan är alltid i synk.
          </p>
        </div>
      </div>

      <div className="px-6 pt-5 pb-8 lg:flex lg:flex-col lg:justify-center lg:px-16 lg:py-10">
       <div className="w-full lg:max-w-sm lg:mx-auto">
        <h1 className="hidden lg:block font-serif text-[34px] font-medium tracking-[-0.02em] text-ink leading-tight mb-2">
          {mode === 'signin' ? 'Välkommen tillbaka' : 'Skapa ditt konto'}
        </h1>
        <p className="text-[15px] text-ink-3 leading-relaxed mb-5 lg:mb-7">
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
     </div>
    </div>
  )
}
