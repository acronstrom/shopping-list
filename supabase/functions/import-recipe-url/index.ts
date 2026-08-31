import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface IngredientSection {
  name: string | null
  ingredients: string[]
}

interface ImportedRecipe {
  name: string
  servings: number | null
  ingredients: string[]
  // Only the AI fallback fills this in — schema.org has no field for ingredient
  // sections, so schema-parsed recipes stay flat. Kept optional (and `ingredients`
  // kept flat) so an older cached client keeps working unchanged.
  ingredientSections?: IngredientSection[]
  instructions: string | null
  image: string | null
  sourceUrl: string
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
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

  // Fast path: schema.org/Recipe. Free and exact, so always try it first.
  let recipe = extractRecipeFromHtml(html, normalizedUrl.toString())
  let source = "schema"

  // Fallback: recipe blogs (ELLE/Aller, among others) publish the recipe as prose
  // in the article body with no Recipe schema. Let the model structure that text.
  if (!recipe) {
    const article = extractArticleText(html)
    if (article) {
      recipe = await parseRecipeFromText(article, normalizedUrl.toString(), html)
      source = "ai"
    }
  }

  if (!recipe || recipe.ingredients.length === 0) {
    return new Response(
      JSON.stringify({ error: "Hittade inget recept på sidan" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  console.log("[import-recipe-url] imported", JSON.stringify({
    url: normalizedUrl.toString(),
    source,
    name: recipe.name,
    ingredientCount: recipe.ingredients.length,
    sectionCount: recipe.ingredientSections?.length ?? 0,
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
    if (recipe) return normalizeRecipe(recipe, sourceUrl, html)
  }
  return null
}

// Walks every JSON-LD block and returns the first node whose @type matches.
function findJsonLdNode(html: string, types: string[]): Record<string, unknown> | null {
  const blocks = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const m of blocks) {
    let parsed: unknown
    try {
      parsed = JSON.parse(m[1].trim())
    } catch {
      continue
    }
    const found = findNodeByType(parsed, types)
    if (found) return found
  }
  return null
}

function findNodeByType(node: unknown, types: string[]): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findNodeByType(item, types)
      if (found) return found
    }
    return null
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>
    const type = obj["@type"]
    const matches = typeof type === "string"
      ? types.includes(type)
      : Array.isArray(type) && type.some(t => typeof t === "string" && types.includes(t))
    if (matches) return obj

    if (Array.isArray(obj["@graph"])) {
      const found = findNodeByType(obj["@graph"], types)
      if (found) return found
    }
    if (obj.mainEntity) {
      const found = findNodeByType(obj.mainEntity, types)
      if (found) return found
    }
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

function normalizeRecipe(
  recipe: Record<string, unknown>,
  sourceUrl: string,
  html: string,
): ImportedRecipe {
  const name = typeof recipe.name === "string"
    ? stripTags(recipe.name) || "Okänt recept"
    : "Okänt recept"

  const servings = parseServings(recipe.recipeYield)

  // Some sites put raw HTML inside recipeIngredient, and use a fully emphasised
  // line ("<strong><u>Marinad</u></strong>") as a sub-heading rather than an
  // ingredient. Strip the markup and promote those lines to sections.
  const ingredientsRaw = recipe.recipeIngredient
  const entries: IngredientEntry[] = []
  let currentSection: string | null = null
  if (Array.isArray(ingredientsRaw)) {
    for (const raw of ingredientsRaw) {
      if (typeof raw !== "string") continue
      if (isSectionHeading(raw)) {
        currentSection = stripTags(raw) || null
        continue
      }
      const text = stripTags(raw)
      if (!text) continue
      entries.push({ text, section: currentSection })
    }
  }
  const { ingredients, sections } = groupIntoSections(entries)

  const instructions = normalizeInstructions(recipe.recipeInstructions)
  const image = pickImage(recipe.image, html, sourceUrl)
  const prepTimeMinutes = parseIsoDurationMinutes(recipe.prepTime)
  const cookTimeMinutes = parseIsoDurationMinutes(recipe.cookTime)
    ?? minutesMinusPrep(parseIsoDurationMinutes(recipe.totalTime), prepTimeMinutes)

  return {
    name,
    servings,
    ingredients,
    ingredientSections: sections,
    instructions,
    image,
    sourceUrl,
    prepTimeMinutes,
    cookTimeMinutes,
  }
}

interface IngredientEntry {
  text: string
  section: string | null
}

// Collapses a section-tagged list into the flat list the client has always
// received, plus the optional grouping. A single unnamed section carries no
// more information than the flat list, so it is dropped.
function groupIntoSections(entries: IngredientEntry[]): {
  ingredients: string[]
  sections: IngredientSection[] | undefined
} {
  const ingredients: string[] = []
  const sections: IngredientSection[] = []

  for (const { text, section } of entries) {
    ingredients.push(text)
    const existing = sections.find(s => s.name === section)
    if (existing) existing.ingredients.push(text)
    else sections.push({ name: section, ingredients: [text] })
  }

  const meaningful = sections.length > 1 || (sections.length === 1 && sections[0].name !== null)
  return { ingredients, sections: meaningful ? sections : undefined }
}

// True when the whole line is wrapped in emphasis markup and carries no digits —
// i.e. a sub-heading like "<strong><u>Kantarellsås</u></strong>" rather than an
// ingredient. Requiring no digits keeps "<strong>2 dl grädde</strong>" an ingredient.
function isSectionHeading(raw: string): boolean {
  // \b matters: without it "b" would also match "<br>", and a digit-free line
  // ending in <br> ("salt (efter smak)<br>") would be mistaken for a heading.
  const withoutEmphasis = raw.replace(/<\/?(?:strong|b|u|em|i|h[1-6])\b[^>]*>/gi, "")
  if (withoutEmphasis === raw) return false
  const text = stripTags(withoutEmphasis)
  if (!text) return false
  return !/\d/.test(text)
}

// Ingredient and step strings are single-line, so tags collapse to a space
// rather than a newline.
function stripTags(s: string): string {
  const withoutTags = s
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
  return dropDecodedTags(decodeEntities(withoutTags)).replace(/\s+/g, " ").trim()
}

// Some sites escape their markup, so tags only appear after entity decoding
// ("&lt;strong&gt;" → "<strong>"). Match known tag names only, so ordinary text
// like "koka till < 100 grader" survives untouched.
const DECODED_TAG_RE =
  /<\/?(?:strong|b|u|i|em|br|p|span|div|a|h[1-6]|ul|ol|li|table|tr|td|img|font)\b[^>]*>/gi

function dropDecodedTags(s: string): string {
  return s.replace(DECODED_TAG_RE, " ")
}

// Schema.org uses ISO 8601 durations (e.g. "PT15M", "PT1H30M"). Hours
// are folded into minutes; days are ignored (recipes don't list them).
function parseIsoDurationMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null
  const m = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?/i)
  if (!m) return null
  const hours = m[1] ? parseInt(m[1], 10) : 0
  const minutes = m[2] ? parseInt(m[2], 10) : 0
  const total = hours * 60 + minutes
  return total > 0 ? total : null
}

function minutesMinusPrep(total: number | null, prep: number | null): number | null {
  if (total === null) return null
  if (prep === null) return total
  return Math.max(0, total - prep) || null
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
    const cleaned = htmlToText(value)
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
    // Blank line between steps so the client splits them into separate steps.
    return steps.length > 0 ? steps.join("\n\n") : null
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
    return stripTags(item) || null
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
      return stripTags(obj.text) || null
    }
    if (typeof obj.name === "string") {
      return stripTags(obj.name) || null
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

// Prefer an already-absolute JSON-LD image (that's the recipe photo on ICA & co),
// then og:image. ELLE's JSON-LD image is a bare path like "uploads/sites/87/…jpg"
// that lives on a different host than the page, so resolving it against the page
// origin 404s — og:image carries the real absolute URL there.
function pickImage(jsonLdImage: unknown, html: string, sourceUrl: string): string | null {
  const fromJsonLd = normalizeImage(jsonLdImage)
  if (fromJsonLd && /^https?:\/\//i.test(fromJsonLd)) return fromJsonLd

  const fromMeta = metaContent(html, "og:image")
  if (fromMeta) {
    const abs = absolutize(fromMeta, sourceUrl)
    if (abs) return abs
  }

  return fromJsonLd ? absolutize(fromJsonLd, sourceUrl) : null
}

function absolutize(src: string, base: string): string | null {
  try {
    return new URL(src, base).toString()
  } catch {
    return null
  }
}

function metaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["']`, "i"),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m) return decodeEntities(m[1]).trim() || null
  }
  return null
}

// ============================================================
// AI fallback for recipe blogs without schema.org/Recipe
// (ELLE / Aller's blog platform puts the whole recipe as prose
// inside the BlogPosting's articleBody.)
// ============================================================

const MAX_ARTICLE_CHARS = 12000

function extractArticleText(html: string): string | null {
  const node = findJsonLdNode(html, ["BlogPosting", "Article", "NewsArticle", "WebPage"])

  let body: string | null = null
  if (node && typeof node.articleBody === "string" && node.articleBody.trim()) {
    body = node.articleBody
  } else {
    body = extractMainHtml(html)
  }
  if (!body) return null

  const headline = (node && typeof node.headline === "string" ? node.headline : null)
    ?? metaContent(html, "og:title")

  const text = htmlToText(body)
  if (!text) return null

  const withHeadline = headline
    ? `${decodeEntities(headline).trim()}\n\n${text}`
    : text

  // Too little text to hold a recipe — don't spend a model call on it.
  if (withHeadline.length < 120) return null

  return withHeadline.slice(0, MAX_ARTICLE_CHARS)
}

function extractMainHtml(html: string): string | null {
  for (const tag of ["article", "main"]) {
    const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"))
    if (m && m[1].trim()) return m[1]
  }
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  return body ? body[1] : null
}

// Keeps the line structure, which is what carries meaning here: each ingredient
// sits on its own <br>-separated line under a bold sub-heading.
function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li|tr|section)\s*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .split("\n")
    .map(dropDecodedTags)
    .map(line => line.replace(/[ \t ]+/g, " ").trim())
    .filter(line => line.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function parseRecipeFromText(
  text: string,
  sourceUrl: string,
  html: string,
): Promise<ImportedRecipe | null> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY")
  if (!openaiKey) {
    console.error("[import-recipe-url] OPENAI_API_KEY saknas – kan inte tolka fritext")
    return null
  }

  let raw: string
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: TEXT_RECIPE_PROMPT },
          { role: "user", content: text },
        ],
        max_tokens: 3000,
        temperature: 0,
      }),
    })
    const data = await response.json()
    raw = (data.choices?.[0]?.message?.content ?? "").trim()
  } catch (err) {
    console.error("[import-recipe-url] openai error", err)
    return null
  }

  let parsed: {
    name?: unknown
    servings?: unknown
    prepTimeMinutes?: unknown
    cookTimeMinutes?: unknown
    ingredients?: unknown
    instructions?: unknown
  }
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error("[import-recipe-url] non-JSON response", raw.slice(0, 500))
    return null
  }

  const entries: IngredientEntry[] = []
  if (Array.isArray(parsed.ingredients)) {
    for (const item of parsed.ingredients) {
      if (!item || typeof item !== "object") continue
      const row = item as { text?: unknown; section?: unknown }
      const line = typeof row.text === "string" ? stripTags(row.text) : ""
      if (!line) continue
      const sectionName = typeof row.section === "string" ? stripTags(row.section) : ""
      entries.push({ text: line, section: sectionName || null })
    }
  }

  const { ingredients, sections } = groupIntoSections(entries)
  if (ingredients.length === 0) return null

  const name = typeof parsed.name === "string" && parsed.name.trim()
    ? stripTags(parsed.name)
    : (metaContent(html, "og:title") ?? "Okänt recept")

  const instructions = typeof parsed.instructions === "string"
    ? parsed.instructions.trim() || null
    : null

  return {
    name,
    servings: parseServings(parsed.servings),
    ingredients,
    ingredientSections: sections,
    instructions,
    image: pickImage(null, html, sourceUrl),
    sourceUrl,
    prepTimeMinutes: parseMinutes(parsed.prepTimeMinutes),
    cookTimeMinutes: parseMinutes(parsed.cookTimeMinutes),
  }
}

function parseMinutes(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value)
    return rounded > 0 ? rounded : null
  }
  if (typeof value === "string") {
    const m = value.match(/(\d+)/)
    if (m) {
      const n = parseInt(m[1], 10)
      return n > 0 ? n : null
    }
  }
  return null
}

const TEXT_RECIPE_PROMPT = `Du extraherar ett recept ur texten från ett blogginlägg eller en receptsida. Texten kan innehålla mycket som inte hör till receptet.

Returnera ENDAST JSON i formatet:
{ "name": "...", "servings": 4, "prepTimeMinutes": null, "cookTimeMinutes": 25, "ingredients": [ { "text": "50 g smör", "section": "Pajsmul" } ], "instructions": "1. ...\\n\\n2. ..." }

Namn:
- "name": receptets titel. Ta bort portionsangivelser och sajtnamn ur titeln, t.ex. "Cheesecake i glas med äpple, 4 portioner" blir "Cheesecake i glas med äpple".

Portioner och tid:
- "servings": antal portioner som ett heltal, t.ex. ur "4 portioner", "4 port" eller "ca 4 pers". Använd null om det inte anges.
- "prepTimeMinutes"/"cookTimeMinutes": antal minuter som heltal om sidan anger förberedelse- respektive tillagningstid. Anges bara en total tid (t.ex. "25 min"), lägg den i "cookTimeMinutes". Använd null när tid inte anges — gissa aldrig.

Ingredienser:
- "text": ingrediensraden ORDAGRANT som den står i receptet, med mängd och enhet, t.ex. "50 g smör", "1 burk finkrossade tomater", "Salt, efter smak". Dela inte upp i namn och mängd och skriv inte om raden.
- "section": namnet på den delrubrik ingrediensen står under, t.ex. "Pajsmul", "Smörstekta äpplen", "Vaniljcheesecake", "Topping", "Sås", "Marinad". Ta bort avslutande kolon ur rubriken.
- Generiska rubriker är INTE sektioner: "Ingredienser", "Du behöver", "Gör så här", "Recept". Ingredienser under en sådan rubrik, eller utan någon rubrik alls, får "section": null.
- Behåll ingrediensernas inbördes ordning. Lista alla ingredienser från sektion A före sektion B osv.
- Slå inte ihop olika ingredienser. Lista varje ingrediens på egen rad.
- Ta inte med brödtext, hälsningsfraser, hashtaggar, emojis, länkar till sociala medier, kommentarer eller tips om andra recept ("gillar du det här receptet så gillar du även...").

Instruktioner:
- "instructions": matlagningsstegen, i receptets ordning.
- Numrera stegen ("1. ", "2. ", …). Om receptets egen numrering hoppar eller upprepar ett nummer, numrera om löpande.
- Separera ALLTID varje steg med en TOM RAD, dvs två radbrytningar ("\\n\\n") mellan stegen – inte bara en enkel radbrytning. Exempel: "1. Koka pastan.\\n\\n2. Stek löken.\\n\\n3. Blanda ihop."
- Bevara stegens innehåll noggrant — slå inte ihop och hitta inte på egna steg.
- Om texten inte innehåller några steg, returnera null.

Skriv allt på svenska. Om texten inte innehåller något recept, returnera { "ingredients": [] }.`

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&(?:aring|Aring);/g, m => (m === "&aring;" ? "å" : "Å"))
    .replace(/&(?:auml|Auml);/g, m => (m === "&auml;" ? "ä" : "Ä"))
    .replace(/&(?:ouml|Ouml);/g, m => (m === "&ouml;" ? "ö" : "Ö"))
    .replace(/&(?:eacute|Eacute);/g, m => (m === "&eacute;" ? "é" : "É"))
    .replace(/&(?:ndash|mdash);/gi, "–")
    .replace(/&(?:lsquo|rsquo|apos);/gi, "'")
    .replace(/&(?:ldquo|rdquo);/gi, '"')
    .replace(/&hellip;/gi, "…")
    .replace(/&frac12;/gi, "½")
    .replace(/&deg;/gi, "°")
    // Numeric entities, decimal and hex (e.g. &#229; &#xE5;).
    .replace(/&#(\d+);/g, (_, d) => safeCodePoint(parseInt(d, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    // &amp; last, so "&amp;lt;" does not become a tag-looking "<".
    .replace(/&amp;/gi, "&")
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return ""
  try {
    return String.fromCodePoint(code)
  } catch {
    return ""
  }
}
