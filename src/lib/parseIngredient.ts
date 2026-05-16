// Swedish recipe ingredient lines come in a "QUANTITY UNIT NAME (notes)"
// shape, e.g. "2 vitlöksklyftor", "400 g körsbärstomater eller
// romanticatomater", "1/2 dl vispgrädde", "svartpeppar".
//
// This parser pulls out the leading quantity + unit and leaves the rest
// as the name. Falls back to {name=line, quantity=null} if no leading
// number is present (e.g. "svartpeppar").

const UNITS = new Set([
  // weight
  'g', 'gr', 'gram', 'kg',
  // volume
  'ml', 'cl', 'dl', 'l', 'liter',
  // spoons & dashes
  'tsk', 'msk', 'krm', 'kkp', 'kkpr', 'kkrm',
  // counts & packaging
  'st', 'styck', 'port', 'portion', 'portioner',
  'förp', 'förpackning', 'förpackningar',
  'paket', 'pkt', 'pkt.',
  'burk', 'burkar', 'burkar.',
  'påse', 'påsar',
  'klyfta', 'klyftor',
  'knippa', 'knippor',
  'näve', 'nävar',
  'nypa', 'nypor',
  // shorthand
  'pkt', 'pkt.',
])

const QUANTITY_RE = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+\/\d+|\d+(?:[.,]\d+)?))?/

export interface ParsedLine {
  name: string
  quantity: string | null
}

export function parseIngredientLine(line: string): ParsedLine {
  const trimmed = line.trim()
  if (!trimmed) return { name: '', quantity: null }

  const match = trimmed.match(QUANTITY_RE)
  if (!match) {
    return { name: capitalizeFirst(trimmed), quantity: null }
  }

  const numericPart = match[0]
  let rest = trimmed.slice(numericPart.length).trim()

  // Greedily consume a unit token if the next word matches one we know.
  let unitToken: string | null = null
  const unitMatch = rest.match(/^([A-Za-zåäöÅÄÖ.]+)\b\s*(.*)$/)
  if (unitMatch) {
    const candidate = unitMatch[1].toLowerCase().replace(/\.$/, '')
    if (UNITS.has(candidate)) {
      unitToken = unitMatch[1]
      rest = unitMatch[2]
    }
  }

  const quantity = unitToken
    ? `${numericPart} ${unitToken}`
    : numericPart

  // Strip a leading parenthetical or trailing one from the name if it's
  // just unit-conversion noise — leave actual notes alone.
  let name = rest.trim()
  name = name.replace(/^[([].*?[)\]]\s*/, '').trim()
  // Drop trailing parenthetical like "(à 125 g)" or "(4 port motsvarar ca 300 g)"
  name = name.replace(/\s*[([][^)\]]*[)\]]\s*$/, '').trim()

  if (!name) {
    return { name: capitalizeFirst(trimmed), quantity: null }
  }

  return {
    name: capitalizeFirst(name),
    quantity,
  }
}

function capitalizeFirst(s: string): string {
  if (!s) return s
  const first = s[0]
  const upper = first.toLocaleUpperCase('sv')
  return upper + s.slice(1)
}
