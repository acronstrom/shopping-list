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
  const master = ctx.createGain()
  master.gain.setValueAtTime(0.0001, t0)
  master.gain.exponentialRampToValueAtTime(0.55, t0 + 0.015)
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32)
  master.connect(ctx.destination)

  // Bright two-note "ding": E5 -> A5
  const o1 = ctx.createOscillator()
  o1.type = 'sine'
  o1.frequency.setValueAtTime(659.25, t0)
  o1.frequency.exponentialRampToValueAtTime(880, t0 + 0.09)
  o1.connect(master)
  o1.start(t0)
  o1.stop(t0 + 0.34)

  // Soft harmonic for a richer tone
  const o2 = ctx.createOscillator()
  o2.type = 'triangle'
  o2.frequency.setValueAtTime(1318.5, t0)
  const harmonicGain = ctx.createGain()
  harmonicGain.gain.setValueAtTime(0.0001, t0)
  harmonicGain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02)
  harmonicGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22)
  o2.connect(harmonicGain).connect(ctx.destination)
  o2.start(t0)
  o2.stop(t0 + 0.24)
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
