// Shared grocery categorization helpers.
//
// Used by the categorize-item edge function (user-facing, JWT-scoped) and by
// the Microsoft To Do sync (service-role, household known up front). Keeping the
// OpenAI call and matching logic here means every insertion path categorizes the
// same way, without any one path depending on a user-token round-trip.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type SupabaseClient = ReturnType<typeof createClient>

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

// Canonical key for matching an item by name. Must stay in sync with
// normalizeItemName() in src/lib/text.ts so the keys written by the app line up
// with the keys looked up here.
export function normalizeItemName(value: string): string {
  return value.trim().toLocaleLowerCase("sv")
}

// Load a household's learned category overrides as a map from normalized item
// name to category. These are explicit user corrections and take priority over
// the model.
export async function loadCategoryOverrides(
  supabase: SupabaseClient,
  householdId: string,
): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("category_overrides")
    .select("item_name, category")
    .eq("household_id", householdId)

  const overrides: Record<string, string> = {}
  for (const row of (data ?? []) as Array<{ item_name?: string; category?: string }>) {
    if (typeof row.item_name === "string" && typeof row.category === "string") {
      overrides[row.item_name] = row.category
    }
  }
  return overrides
}

// Return a learned override for a name, but only if it still points at a valid
// category (the category could have since been renamed or removed).
function overrideFor(
  itemName: string,
  categories: string[],
  overrides: Record<string, string> | undefined,
): string | null {
  if (!overrides) return null
  const hit = overrides[normalizeItemName(itemName)]
  return hit && categories.includes(hit) ? hit : null
}

// Categorize a single item name. Returns "Övrigt" on any failure (missing key,
// network error, unparseable response) — categorization is always best-effort.
export async function categorizeName(
  itemName: string,
  categories: string[],
  openaiKey: string | undefined,
  overrides?: Record<string, string>,
): Promise<string> {
  if (!itemName) return "Övrigt"

  const learned = overrideFor(itemName, categories, overrides)
  if (learned) return learned

  if (!openaiKey) return "Övrigt"

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
            content: `Du kategoriserar matvaror på svenska. Användaren skickar ett varunamn på svenska (t.ex. "mjölk", "tomater", "leverpastej"). Svara med ENDAST en kategori, exakt som den står i listan nedan, utan extra text, citattecken eller förklaring. Om varan inte tydligt passar i någon kategori, svara "Övrigt".\n\nTillåtna kategorier:\n${categories.join(", ")}`,
          },
          { role: "user", content: itemName },
        ],
        max_tokens: 20,
        temperature: 0,
      }),
    })

    const data = await response.json()
    const raw = (data.choices?.[0]?.message?.content ?? "").trim()
    const category = matchCategory(raw, categories)

    console.log("[categorize]", JSON.stringify({ itemName, raw, matched: category }))
    return category
  } catch (err) {
    console.error("[categorize] error", err)
    return "Övrigt"
  }
}

// Categorize many item names in a single OpenAI call. Returns a map from each
// input name to its category; any name missing from the response (or any
// failure) falls back to "Övrigt".
export async function categorizeNames(
  itemNames: string[],
  categories: string[],
  openaiKey: string | undefined,
  overrides?: Record<string, string>,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  for (const n of itemNames) result[n] = "Övrigt"

  // Learned overrides win and never hit the model. Only ask about the rest.
  const remaining: string[] = []
  for (const n of itemNames) {
    const learned = overrideFor(n, categories, overrides)
    if (learned) result[n] = learned
    else remaining.push(n)
  }

  if (remaining.length === 0 || !openaiKey) return result

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
            content: `Du kategoriserar matvaror på svenska. Användaren skickar en JSON-array med varunamn (t.ex. ["mjölk", "tomater", "leverpastej"]). Svara med ENDAST ett JSON-objekt där varje nyckel är ett varunamn exakt som det skrevs och värdet är EN kategori från listan nedan, utan extra text eller förklaring. Om en vara inte tydligt passar i någon kategori, använd "Övrigt".\n\nTillåtna kategorier:\n${categories.join(", ")}`,
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
        result[name] = matchCategory(value, categories)
      }
    }

    console.log("[categorize] batch", JSON.stringify({ count: itemNames.length, fromModel: remaining.length, result }))
    return result
  } catch (err) {
    console.error("[categorize] batch error", err)
    return result
  }
}

// Sanitize a raw model response down to one of the allowed categories.
export function matchCategory(raw: string, categories: string[]): string {
  if (!raw) return "Övrigt"

  // Strip surrounding quotes, leading/trailing punctuation, and whitespace.
  const cleaned = raw
    .replace(/^[\s"'`*_]+|[\s"'`*_.,;:!?]+$/g, "")
    .trim()

  // Exact match.
  if (categories.includes(cleaned)) return cleaned

  // Case-insensitive match.
  const lower = cleaned.toLocaleLowerCase("sv")
  const ci = categories.find(c => c.toLocaleLowerCase("sv") === lower)
  if (ci) return ci

  // Substring match: the model wrapped the category in a sentence.
  const containing = categories.find(c => cleaned.includes(c))
  if (containing) return containing

  return "Övrigt"
}
