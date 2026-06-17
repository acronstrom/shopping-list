export function capitalizeFirst(value: string): string {
  if (!value) return value
  // Use Array.from so surrogate-pair emoji/letters are treated as single code points.
  const chars = Array.from(value)
  let i = 0
  while (i < chars.length && !/\p{L}|\p{N}/u.test(chars[i])) i++
  if (i >= chars.length) return value
  chars[i] = chars[i].toLocaleUpperCase('sv')
  return chars.join('')
}

// Canonical key for matching an item by name regardless of casing/whitespace.
// Used for learned category overrides — must stay in sync with the identically
// named helper in supabase/functions/_shared/categorize.ts.
export function normalizeItemName(value: string): string {
  return value.trim().toLocaleLowerCase('sv')
}
