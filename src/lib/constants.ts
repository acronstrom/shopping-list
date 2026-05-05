export const NAV_ITEMS = [
  { to: '/', label: 'Lista', icon: '🛒' },
  { to: '/stores', label: 'Butiker', icon: '🏪' },
  { to: '/history', label: 'Historik', icon: '📋' },
  { to: '/settings', label: 'Inställningar', icon: '⚙️' },
] as const

export const CATEGORIES = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Bakery',
  'Frozen',
  'Pantry',
  'Snacks',
  'Beverages',
  'Household',
  'Personal Care',
  'Baby',
  'Pet',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS_SV: Record<string, string> = {
  'Produce': 'Frukt & Grönt',
  'Dairy & Eggs': 'Mejeri & Ägg',
  'Meat & Seafood': 'Kött & Fisk',
  'Bakery': 'Bageri',
  'Frozen': 'Fryst',
  'Pantry': 'Skafferi',
  'Snacks': 'Snacks',
  'Beverages': 'Drycker',
  'Household': 'Hushåll',
  'Personal Care': 'Hygien',
  'Baby': 'Baby',
  'Pet': 'Husdjur',
  'Other': 'Övrigt',
}

export function getCategoryLabelSv(category: string) {
  return CATEGORY_LABELS_SV[category] ?? category
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Produce': 'bg-green-100 text-green-800',
  'Dairy & Eggs': 'bg-blue-100 text-blue-800',
  'Meat & Seafood': 'bg-red-100 text-red-800',
  'Bakery': 'bg-amber-100 text-amber-800',
  'Frozen': 'bg-cyan-100 text-cyan-800',
  'Pantry': 'bg-yellow-100 text-yellow-800',
  'Snacks': 'bg-orange-100 text-orange-800',
  'Beverages': 'bg-purple-100 text-purple-800',
  'Household': 'bg-slate-100 text-slate-800',
  'Personal Care': 'bg-pink-100 text-pink-800',
  'Baby': 'bg-violet-100 text-violet-800',
  'Pet': 'bg-lime-100 text-lime-800',
  'Other': 'bg-gray-100 text-gray-600',
}
