import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface ImportedRecipe {
  name: string
  servings: number | null
  ingredients: string[]
  instructions: string | null
  image: string | null
  sourceUrl: string
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { url } = await req.json()
  if (!url || typeof url !== "string") {
    return new Response(JSON.stringify({ error: "URL saknas" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let normalizedUrl: URL
  try {
    normalizedUrl = new URL(url)
    if (!/^https?:$/.test(normalizedUrl.protocol)) throw new Error("bad-protocol")
  } catch {
    return new Response(JSON.stringify({ error: "Ogiltig URL" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let html: string
  try {
    const res = await fetch(normalizedUrl.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.5",
      },
    })
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Kunde inte hämta sidan (HTTP ${res.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    html = await res.text()
  } catch (err) {
    console.error("[import-recipe-url] fetch error", err)
    return new Response(JSON.stringify({ error: "Kunde inte hämta sidan" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const recipe = extractRecipeFromHtml(html, normalizedUrl.toString())
  if (!recipe) {
    return new Response(
      JSON.stringify({ error: "Hittade inget recept på sidan" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  console.log("[import-recipe-url] imported", JSON.stringify({
    url: normalizedUrl.toString(),
    name: recipe.name,
    ingredientCount: recipe.ingredients.length,
    hasInstructions: !!recipe.instructions,
  }))

  return new Response(JSON.stringify(recipe), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})

// ============================================================
// JSON-LD Recipe extraction (schema.org/Recipe)
// Works for ICA, Köket, Allt om Mat, NYT Cooking, BBC Good Food, …
// any site that embeds a schema.org Recipe object.
// ============================================================

function extractRecipeFromHtml(html: string, sourceUrl: string): ImportedRecipe | null {
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const m of blocks) {
    const raw = m[1].trim()
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      continue
    }
    const recipe = findRecipeNode(parsed)
    if (recipe) return normalizeRecipe(recipe, sourceUrl)
  }
  return null
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item)
      if (found) return found
    }
    return null
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>
    const type = obj["@type"]
    if (type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"))) {
      return obj
    }
    // Schema.org Graph: { "@graph": [...] } or nested mainEntity references
    if (Array.isArray(obj["@graph"])) {
      const found = findRecipeNode(obj["@graph"])
      if (found) return found
    }
    if (obj.mainEntity) {
      const found = findRecipeNode(obj.mainEntity)
      if (found) return found
    }
  }
  return null
}

function normalizeRecipe(recipe: Record<string, unknown>, sourceUrl: string): ImportedRecipe {
  const name = typeof recipe.name === "string"
    ? decodeEntities(recipe.name).trim()
    : "Okänt recept"

  const servings = parseServings(recipe.recipeYield)

  const ingredientsRaw = recipe.recipeIngredient
  const ingredients: string[] = Array.isArray(ingredientsRaw)
    ? ingredientsRaw
        .filter((s): s is string => typeof s === "string")
        .map(s => decodeEntities(s).replace(/\s+/g, " ").trim())
        .filter(s => s.length > 0)
    : []

  const instructions = normalizeInstructions(recipe.recipeInstructions)
  const image = normalizeImage(recipe.image)

  return { name, servings, ingredients, instructions, image, sourceUrl }
}

function parseServings(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(1, Math.round(value))
  if (typeof value === "string") {
    const match = value.match(/(\d+)/)
    if (match) return Math.max(1, parseInt(match[1], 10))
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const parsed = parseServings(v)
      if (parsed !== null) return parsed
    }
  }
  return null
}

function normalizeInstructions(value: unknown): string | null {
  if (!value) return null

  // String: just split on newlines or numbered steps later in the client.
  if (typeof value === "string") {
    const cleaned = decodeEntities(value).replace(/\s+\n/g, "\n").trim()
    return cleaned || null
  }

  if (Array.isArray(value)) {
    const steps: string[] = []
    let counter = 1
    for (const item of value) {
      const text = extractStepText(item)
      if (!text) continue
      steps.push(`${counter}. ${text}`)
      counter++
    }
    return steps.length > 0 ? steps.join("\n") : null
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>
    if (Array.isArray(obj.itemListElement)) {
      return normalizeInstructions(obj.itemListElement)
    }
    const text = extractStepText(obj)
    return text ? text : null
  }

  return null
}

function extractStepText(item: unknown): string | null {
  if (typeof item === "string") {
    return decodeEntities(item).replace(/\s+/g, " ").trim() || null
  }
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>

    // HowToSection contains a list of steps; flatten.
    if (obj["@type"] === "HowToSection" && Array.isArray(obj.itemListElement)) {
      const parts = obj.itemListElement
        .map(extractStepText)
        .filter((s): s is string => !!s)
      return parts.length > 0 ? parts.join(" ") : null
    }

    if (typeof obj.text === "string") {
      return decodeEntities(obj.text).replace(/\s+/g, " ").trim() || null
    }
    if (typeof obj.name === "string") {
      return decodeEntities(obj.name).replace(/\s+/g, " ").trim() || null
    }
  }
  return null
}

function normalizeImage(value: unknown): string | null {
  if (typeof value === "string") return value
  if (Array.isArray(value) && value.length > 0) return normalizeImage(value[0])
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>
    if (typeof obj.url === "string") return obj.url
  }
  return null
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#xa0;/gi, " ")
}
