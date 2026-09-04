// Pull cooking durations out of free-form Swedish step text so a step can
// offer a tap-to-start timer ("Sjud i 10–15 min" → a 10 min chip).

export interface StepDuration {
  label: string
  seconds: number
}

// Longest unit spellings first — the alternation is ordered, so "minuter" must
// be tried before "minut" before "min" or the shorter one wins and the rest of
// the word is left dangling on the \b check.
const DURATION_RE =
  /(\d+(?:[.,]\d+)?)(?:\s*(?:[-–—]|till)\s*(\d+(?:[.,]\d+)?))?\s*(sekunder|sekunds|sekund|sek|minuters|minuter|minuts|minut|min|timmars|timmar|timmes|timme|tim|h)\b/gi

const MIN_SECONDS = 5
const MAX_SECONDS = 12 * 3600

function unitToSeconds(unit: string): number {
  const u = unit.toLowerCase()
  if (u.startsWith('sek')) return 1
  if (u.startsWith('min')) return 60
  return 3600
}

// A range ("10-15 min") arms the *lower* bound: being called back to check
// early beats scorching something while the timer still has five minutes left.
export function parseDurations(step: string): StepDuration[] {
  const found: StepDuration[] = []
  const seen = new Set<number>()

  for (const match of step.matchAll(DURATION_RE)) {
    const [raw, lower, , unit] = match
    const value = Number(lower.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) continue

    const seconds = Math.round(value * unitToSeconds(unit))
    if (seconds < MIN_SECONDS || seconds > MAX_SECONDS) continue
    if (seen.has(seconds)) continue

    seen.add(seconds)
    found.push({ label: raw.trim().replace(/\s+/g, ' '), seconds })
  }

  return found
}

// mm:ss under an hour, h:mm:ss above it.
export function formatRemaining(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}
