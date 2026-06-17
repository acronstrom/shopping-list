let audioCtx: AudioContext | null = null
let unlocked = false
let lastPlayedAt = 0

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) return audioCtx
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    audioCtx = new Ctor()
  } catch {
    return null
  }
  return audioCtx
}

function unlockAudio() {
  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {})
  }
  if (!unlocked) {
    try {
      const buffer = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.connect(ctx.destination)
      src.start(0)
      unlocked = true
    } catch {
      // ignored — will retry on next gesture
    }
  }
}

if (typeof window !== 'undefined') {
  const handler = () => {
    unlockAudio()
    if (unlocked && audioCtx && audioCtx.state === 'running') {
      window.removeEventListener('pointerdown', handler)
      window.removeEventListener('touchstart', handler)
      window.removeEventListener('keydown', handler)
    }
  }
  window.addEventListener('pointerdown', handler)
  window.addEventListener('touchstart', handler, { passive: true })
  window.addEventListener('keydown', handler)
}

export function playCompleteSound() {
  const now = Date.now()
  if (now - lastPlayedAt < 60) return
  lastPlayedAt = now

  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  unlockAudio()

  const t0 = ctx.currentTime

  // Crisp struck-bell "ding": a single clear pitch with inharmonic bell
  // partials. The sharp (~4ms) attack gives the percussive strike, and the
  // higher partials decay faster than the fundamental — the signature of a
  // real bell rather than a pure beep or a pitch-bending swoop.
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.5, t0)
  master.connect(ctx.destination)

  const fundamental = 880 // A5
  // [frequency ratio, peak gain, decay seconds]
  const partials: Array<[number, number, number]> = [
    [1, 1.0, 0.6],
    [2, 0.55, 0.42],
    [2.76, 0.3, 0.28],
    [5.4, 0.12, 0.16],
  ]
  for (const [ratio, peak, decay] of partials) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(fundamental * ratio, t0)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay)
    osc.connect(g).connect(master)
    osc.start(t0)
    osc.stop(t0 + decay + 0.02)
  }
}

export function playUncheckSound() {
  const now = Date.now()
  if (now - lastPlayedAt < 60) return
  lastPlayedAt = now

  const ctx = getAudioContext()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  unlockAudio()

  const t0 = ctx.currentTime
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t0)
  gain.gain.exponentialRampToValueAtTime(0.28, t0 + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16)
  gain.connect(ctx.destination)

  const o = ctx.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(440, t0)
  o.frequency.exponentialRampToValueAtTime(330, t0 + 0.12)
  o.connect(gain)
  o.start(t0)
  o.stop(t0 + 0.18)
}
