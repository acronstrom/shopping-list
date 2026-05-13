let audioCtx: AudioContext | null = null
let lastPlayedAt = 0

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  audioCtx = new Ctor()
  return audioCtx
}

export function playCompleteSound() {
  const now = Date.now()
  if (now - lastPlayedAt < 60) return
  lastPlayedAt = now

  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})

  const t0 = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
  gain.connect(ctx.destination)

  // Bright two-note "ding": E5 -> A5
  const o1 = ctx.createOscillator()
  o1.type = 'sine'
  o1.frequency.setValueAtTime(659.25, t0)
  o1.frequency.exponentialRampToValueAtTime(880, t0 + 0.08)
  o1.connect(gain)
  o1.start(t0)
  o1.stop(t0 + 0.24)

  // Soft harmonic for a richer tone
  const o2 = ctx.createOscillator()
  o2.type = 'triangle'
  o2.frequency.setValueAtTime(1318.5, t0)
  const harmonicGain = ctx.createGain()
  harmonicGain.gain.setValueAtTime(0.0001, t0)
  harmonicGain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02)
  harmonicGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18)
  o2.connect(harmonicGain).connect(ctx.destination)
  o2.start(t0)
  o2.stop(t0 + 0.2)
}

export function playUncheckSound() {
  const now = Date.now()
  if (now - lastPlayedAt < 60) return
  lastPlayedAt = now

  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})

  const t0 = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12)
  gain.connect(ctx.destination)

  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(440, t0)
  o.frequency.exponentialRampToValueAtTime(330, t0 + 0.1)
  o.connect(gain)
  o.start(t0)
  o.stop(t0 + 0.14)
}
