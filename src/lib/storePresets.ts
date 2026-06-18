// Store layout presets: an ordered list of store sections plus a default
// mapping from the household's generic categories to those sections. Applying a
// preset to a store writes store_category_orders (sections + order) and
// store_category_map (generic -> section). Both are editable afterwards.

export interface StorePreset {
  id: string
  label: string
  /** Sections in physical store order (first = walked first). */
  sections: string[]
  /** Generic household category -> store section. Unmapped categories fall back
   *  to their own name as the section. */
  mapping: Record<string, string>
}

// ICA Maxi — 24 departments in aisle order from the in-store signage.
export const ICA_MAXI_PRESET: StorePreset = {
  id: 'ica-maxi',
  label: 'ICA Maxi',
  sections: [
    'Förbutik',
    'Blommor',
    'Säsong',
    'Hälsa & Skönhet',
    'Kläder',
    'Familjen',
    'El & Media',
    'Fixa',
    'Köket',
    'Dryck',
    'Godis',
    'Djurmat',
    'Tvätt',
    'Städ',
    'Papper',
    'Bröd',
    'Bageri',
    'Fryst',
    'Kött & Chark',
    'Saluhall',
    'Frukt & Grönt',
    'Mejeri',
    'Skafferi',
    'Kassan',
  ],
  mapping: {
    'Frukt & Grönt': 'Frukt & Grönt',
    'Mejeri & Ägg': 'Mejeri',
    'Kött & Chark': 'Kött & Chark',
    'Fisk & Skaldjur': 'Saluhall',
    'Bröd': 'Bröd',
    'Bageri & Fikabröd': 'Bageri',
    'Fryst': 'Fryst',
    'Skafferi': 'Skafferi',
    'Frukost': 'Skafferi',
    'Snacks & Godis': 'Godis',
    'Dryck': 'Dryck',
    'Hygien': 'Hälsa & Skönhet',
    'Tvätt & Städ': 'Städ',
    'Papper & Hushåll': 'Papper',
    'Djurmat': 'Djurmat',
    'Barn & Familj': 'Familjen',
  },
}

export const STORE_PRESETS: StorePreset[] = [ICA_MAXI_PRESET]
