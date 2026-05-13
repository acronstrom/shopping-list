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
