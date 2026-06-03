export const CATEGORIES = [
  'Frukt & Grönt',
  'Mejeri & Ägg',
  'Kött & Chark',
  'Fisk & Skaldjur',
  'Bröd',
  'Bageri & Fikabröd',
  'Fryst',
  'Skafferi',
  'Snacks & Godis',
  'Dryck',
  'Hygien',
  'Tvätt & Städ',
  'Papper & Hushåll',
  'Djurmat',
  'Barn & Familj',
  'Övrigt',
] as const

/* Category → dot color utility (redesign). The 16 Swedish categories share the
   11 token hues from index.css; utility-class literals so Tailwind keeps them. */
export const CATEGORY_DOT_COLORS: Record<string, string> = {
  'Frukt & Grönt':      'bg-c-produce',
  'Mejeri & Ägg':       'bg-c-dairy',
  'Kött & Chark':       'bg-c-meat',
  'Fisk & Skaldjur':    'bg-c-fish',
  'Bröd':               'bg-c-bread',
  'Bageri & Fikabröd':  'bg-c-bakery',
  'Fryst':              'bg-c-frozen',
  'Skafferi':           'bg-c-pantry',
  'Snacks & Godis':     'bg-c-snacks',
  'Dryck':              'bg-c-drink',
  'Hygien':             'bg-c-fish',
  'Tvätt & Städ':       'bg-c-drink',
  'Papper & Hushåll':   'bg-c-pantry',
  'Djurmat':            'bg-c-produce',
  'Barn & Familj':      'bg-c-snacks',
  'Övrigt':             'bg-c-other',
}

export function categoryDotClass(category: string): string {
  return CATEGORY_DOT_COLORS[category] ?? 'bg-c-other'
}
