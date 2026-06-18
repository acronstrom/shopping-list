// Shared grocery categorization helpers.
//
// Used by the categorize-item edge function (user-facing, JWT-scoped) and by
// the Microsoft To Do sync (service-role, household known up front). Keeping the
// OpenAI call and matching logic here means every insertion path categorizes the
// same way, without any one path depending on a user-token round-trip.
//
// Two levels: a department (household_categories.name, e.g. "Skafferi") and an
// optional subcategory within it (household_subcategories, e.g. "Pasta"). The
// model is asked for the most specific label; we resolve it back to a
// { category, subcategory } pair.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type SupabaseClient = ReturnType<typeof createClient>

export interface Categorization {
  category: string
  subcategory: string | null
}

export interface SubcategoryIndex {
  byName: Record<string, string>      // subcategory name -> parent department
  byParent: Record<string, string[]>  // department -> ordered subcategory names
  all: string[]                       // every subcategory name
}

// Load a household's category names, in display order, always including "Övrigt"
// as the fallback bucket.
export async function loadHouseholdCategories(
  supabase: SupabaseClient,
  householdId: string,
): Promise<string[]> {
  const { data: categoryRows } = await supabase
    .from("household_categories")
    .select("name, sort_order")
    .eq("household_id", householdId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  const categories = (categoryRows ?? [])
    .map(r => (r as { name?: string }).name)
    .filter((v): v is string => !!v && typeof v === "string")

  if (!categories.includes("Övrigt")) categories.push("Övrigt")
  return categories
}

// Load a household's subcategories, indexed for prompt-building and resolution.
export async function loadSubcategories(
  supabase: SupabaseClient,
  householdId: string,
): Promise<SubcategoryIndex> {
  const { data } = await supabase
    .from("household_subcategories")
    .select("parent_category, name, sort_order")
    .eq("household_id", householdId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })

  const byName: Record<string, string> = {}
  const byParent: Record<string, string[]> = {}
  const all: string[] = []
  for (const row of (data ?? []) as Array<{ parent_category?: string; name?: string }>) {
    if (typeof row.parent_category === "string" && typeof row.name === "string") {
      byName[row.name] = row.parent_category
      ;(byParent[row.parent_category] ??= []).push(row.name)
      all.push(row.name)
    }
  }
  return { byName, byParent, all }
}

// Canonical key for matching an item by name. Must stay in sync with
// normalizeItemName() in src/lib/text.ts so the keys written by the app line up
// with the keys looked up here.
export function normalizeItemName(value: string): string {
  return value.trim().toLocaleLowerCase("sv")
}

// Load learned overrides as a map from normalized item name to a { category,
// subcategory } pair. These are explicit user corrections and beat the model.
export async function loadCategoryOverrides(
  supabase: SupabaseClient,
  householdId: string,
): Promise<Record<string, Categorization>> {
  const { data } = await supabase
    .from("category_overrides")
    .select("item_name, category, subcategory")
    .eq("household_id", householdId)

  const overrides: Record<string, Categorization> = {}
  for (const row of (data ?? []) as Array<{ item_name?: string; category?: string; subcategory?: string | null }>) {
    if (typeof row.item_name === "string" && typeof row.category === "string") {
      overrides[row.item_name] = {
        category: row.category,
        subcategory: typeof row.subcategory === "string" ? row.subcategory : null,
      }
    }
  }
  return overrides
}

const OTHER: Categorization = { category: "Övrigt", subcategory: null }

// Map a single allowed label (department or subcategory name) to a pair.
function resolveLabel(label: string, categories: string[], subs: SubcategoryIndex): Categorization {
  const parent = subs.byName[label]
  if (parent) return { category: parent, subcategory: label }
  if (categories.includes(label)) return { category: label, subcategory: null }
  return OTHER
}

// Return a learned override for a name, but only if it still points at valid
// taxonomy (a department/subcategory could have since been renamed or removed).
function overrideFor(
  itemName: string,
  categories: string[],
  subs: SubcategoryIndex,
  overrides: Record<string, Categorization> | undefined,
): Categorization | null {
  if (!overrides) return null
  const hit = overrides[normalizeItemName(itemName)]
  if (!hit) return null
  if (hit.subcategory && subs.byName[hit.subcategory]) {
    return { category: subs.byName[hit.subcategory], subcategory: hit.subcategory }
  }
  if (categories.includes(hit.category)) return { category: hit.category, subcategory: null }
  return null
}

// Department list for the prompt, with each department's subcategories after a
// colon, e.g. "Skafferi: Pasta, Ris, Mjöl".
function buildCategoryList(categories: string[], byParent: Record<string, string[]>): string {
  return categories
    .map(c => {
      const s = byParent[c]
      return s && s.length > 0 ? `${c}: ${s.join(", ")}` : c
    })
    .join("\n")
}

const SYSTEM_RULES =
  `Du kategoriserar matvaror på svenska. Listan nedan har en avdelning per rad; efter ett kolon listas avdelningens underkategorier. ` +
  `Svara med EXAKT ett namn som finns i listan – antingen en underkategori eller en avdelning. Hitta ALDRIG på egna namn. ` +
  `Välj den mest specifika underkategori som passar; om ingen underkategori passar, välj den avdelning som passar bäst (t.ex. kaffe och läsk hör till "Dryck"). ` +
  `Välj alltid den närmaste kategorin. Använd "Övrigt" ENDAST om varan verkligen inte hör hemma i någon av kategorierna. ` +
  `Svara med enbart kategorinamnet, utan extra text, citattecken eller förklaring.`

// Categorize a single item name. Returns "Övrigt" on any failure (missing key,
// network error, unparseable response) — categorization is always best-effort.
export async function categorizeName(
  itemName: string,
  categories: string[],
  subs: SubcategoryIndex,
  openaiKey: string | undefined,
  overrides?: Record<string, Categorization>,
): Promise<Categorization> {
  if (!itemName) return OTHER

  const learned = overrideFor(itemName, categories, subs, overrides)
  if (learned) return learned

  if (!openaiKey) return OTHER

  const allLabels = [...categories, ...subs.all]

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `${SYSTEM_RULES}\n\nKategorier:\n${buildCategoryList(categories, subs.byParent)}`,
          },
          { role: "user", content: itemName },
        ],
        max_tokens: 20,
        temperature: 0,
      }),
    })

    const data = await response.json()
    const raw = (data.choices?.[0]?.message?.content ?? "").trim()
    const matched = matchCategory(raw, allLabels)
    const resolved = resolveLabel(matched, categories, subs)

    console.log("[categorize]", JSON.stringify({ itemName, raw, matched, resolved }))
    return resolved
  } catch (err) {
    console.error("[categorize] error", err)
    return OTHER
  }
}

// Categorize many item names in a single OpenAI call. Returns a map from each
// input name to its { category, subcategory }; any name missing from the
// response (or any failure) falls back to "Övrigt".
export async function categorizeNames(
  itemNames: string[],
  categories: string[],
  subs: SubcategoryIndex,
  openaiKey: string | undefined,
  overrides?: Record<string, Categorization>,
): Promise<Record<string, Categorization>> {
  const result: Record<string, Categorization> = {}
  for (const n of itemNames) result[n] = OTHER

  // Learned overrides win and never hit the model. Only ask about the rest.
  const remaining: string[] = []
  for (const n of itemNames) {
    const learned = overrideFor(n, categories, subs, overrides)
    if (learned) result[n] = learned
    else remaining.push(n)
  }

  if (remaining.length === 0 || !openaiKey) return result

  const allLabels = [...categories, ...subs.all]

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `${SYSTEM_RULES}\n\nAnvändaren skickar en JSON-array med varunamn. Svara med ENDAST ett JSON-objekt där varje nyckel är ett varunamn exakt som det skrevs och värdet är kategorinamnet.\n\nKategorier:\n${buildCategoryList(categories, subs.byParent)}`,
          },
          { role: "user", content: JSON.stringify(remaining) },
        ],
        max_tokens: Math.min(2000, 100 + remaining.length * 25),
        temperature: 0,
      }),
    })

    const data = await response.json()
    const raw = (data.choices?.[0]?.message?.content ?? "").trim()

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error("[categorize] non-JSON batch response", raw)
      return result
    }

    for (const name of remaining) {
      const value = parsed[name]
      if (typeof value === "string") {
        result[name] = resolveLabel(matchCategory(value, allLabels), categories, subs)
      }
    }

    console.log("[categorize] batch", JSON.stringify({ count: itemNames.length, fromModel: remaining.length, result }))
    return result
  } catch (err) {
    console.error("[categorize] batch error", err)
    return result
  }
}

// Sanitize a raw model response down to one of the allowed labels.
export function matchCategory(raw: string, labels: string[]): string {
  if (!raw) return "Övrigt"

  // Strip surrounding quotes, leading/trailing punctuation, and whitespace.
  const cleaned = raw
    .replace(/^[\s"'`*_]+|[\s"'`*_.,;:!?]+$/g, "")
    .trim()

  // Exact match.
  if (labels.includes(cleaned)) return cleaned

  // Case-insensitive match.
  const lower = cleaned.toLocaleLowerCase("sv")
  const ci = labels.find(c => c.toLocaleLowerCase("sv") === lower)
  if (ci) return ci

  // Substring match: the model wrapped the label in a sentence.
  const containing = labels.find(c => cleaned.includes(c))
  if (containing) return containing

  return "Övrigt"
}
