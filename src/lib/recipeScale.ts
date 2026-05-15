// Scale a free-form quantity string by a multiplier. Handles the
// common Swedish recipe formats — integers, decimals (point or comma),
// simple fractions, ranges — and leaves anything non-numeric untouched.

export function scaleQuantity(quantity: string | null, factor: number): string | null {
  if (!quantity) return quantity
  if (factor === 1) return quantity
  if (!Number.isFinite(factor) || factor <= 0) return quantity

  // Match a leading number-ish token followed by the rest (unit + extras).
  // Supported leading tokens:
  //   "3"       integer
  //   "1.5"     dot decimal
  //   "1,5"     comma decimal (Swedish)
  //   "1/2"     fraction
  //   "1 1/2"   mixed number
  //   "2-3"     range — scale both endpoints
  const match = quantity
    .trim()
    .match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?|\d+\/\d+))?(.*)$/)

  if (!match) return quantity

  const [, firstRaw, secondRaw, restRaw] = match
  const first = parseNumber(firstRaw)
  if (first === null) return quantity

  const scaledFirst = formatNumber(first * factor)
  const rest = restRaw ?? ''

  if (secondRaw) {
    const second = parseNumber(secondRaw)
    if (second === null) return `${scaledFirst}${rest}`
    return `${scaledFirst}-${formatNumber(second * factor)}${rest}`
  }

  return `${scaledFirst}${rest}`
}

function parseNumber(s: string): number | null {
  const trimmed = s.trim()
  // Mixed: "1 1/2"
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) {
    const w = Number(mixed[1])
    const n = Number(mixed[2])
    const d = Number(mixed[3])
    if (d === 0) return null
    return w + n / d
  }
  // Pure fraction: "1/2"
  const frac = trimmed.match(/^(\d+)\/(\d+)$/)
  if (frac) {
    const n = Number(frac[1])
    const d = Number(frac[2])
    if (d === 0) return null
    return n / d
  }
  // Decimal — accept both 1.5 and 1,5
  const value = Number(trimmed.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

function formatNumber(value: number): string {
  // Round to 2 decimals, then strip trailing zeros.
  const rounded = Math.round(value * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  // Swedish convention uses comma for decimals.
  return rounded.toString().replace('.', ',')
}
